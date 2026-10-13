"""
locustfile.py — Test de charge du chatbot RAG (Attijari Bank).

Cible l'endpoint réel:  POST /chat   (api/routes.py)
Authentification: JWT Bearer obligatoire (get_current_user_dependency).

Le token est lu depuis la variable d'environnement CHAT_JWT.
Génère-le d'abord avec:   python get_test_token.py

------------------------------------------------------------------------------
Lancement (depuis la racine du projet, backend déjà démarré sur 127.0.0.1:8000):

  # 1) backend dans un terminal
  uvicorn api.app:app --host 127.0.0.1 --port 8000

  # 2) token (PowerShell)
  $env:CHAT_JWT = (python get_test_token.py)
  #    token (bash/git-bash)
  export CHAT_JWT=$(python get_test_token.py)

  # 3) test 50 users
  locust -f locustfile.py --headless -u 50  -r 5  -t 3m --host http://127.0.0.1:8000 --html rapport_50_users.html
  # 4) test 100 users
  locust -f locustfile.py --headless -u 100 -r 10 -t 3m --host http://127.0.0.1:8000 --html rapport_100_users.html
------------------------------------------------------------------------------

Remarques importantes pour l'interprétation:
- /chat répond en SSE (text/event-stream) mais la réponse LLM est entièrement
  générée AVANT le streaming (faux streaming). On effectue donc un POST normal
  et on lit tout le corps : le temps mesuré = latence complète de génération.
- USE_GEMINI=false dans ce projet → chaque /chat = appel Groq (llama-3.3-70b).
  Sous 50/100 users simultanés, les rate limits Groq (HTTP 429) sont probables :
  ils sont comptés séparément ci-dessous pour pouvoir les signaler honnêtement.
"""

import os
import random

from locust import HttpUser, task, between

# ── Token JWT ─────────────────────────────────────────────────────────────────
CHAT_JWT = os.getenv("CHAT_JWT", "").strip()

# ── Questions bancaires réalistes (FR) ────────────────────────────────────────
QUESTIONS = [
    "Quelles cartes bancaires proposez-vous ?",
    "Quels sont les avantages de la carte CIB ?",
    "Quels sont les taux du crédit immobilier ?",
    "Comment ouvrir un compte bancaire ?",
    "Quelles assurances proposez-vous ?",
    "Quels sont les services de banque à distance ?",
]


class ChatbotUser(HttpUser):
    # Temps de réflexion entre deux questions d'un même utilisateur (réaliste).
    wait_time = between(1, 4)

    def on_start(self):
        if not CHAT_JWT:
            # On échoue vite et clairement plutôt que de générer 100 % d'erreurs 401.
            raise RuntimeError(
                "CHAT_JWT non défini. Génère un token: `python get_test_token.py` "
                "puis exporte-le dans CHAT_JWT avant de lancer Locust."
            )
        self.headers = {
            "Authorization": f"Bearer {CHAT_JWT}",
            "Content-Type": "application/json",
        }

    @task
    def ask_chatbot(self):
        payload = {
            "message": random.choice(QUESTIONS),
            "language": "auto",
            "segment": "particulier",
            "dataset": "particulier",
            "history": [],
        }

        # timeout côté client > timeout Groq (60 s) pour distinguer un vrai timeout
        # serveur d'une simple latence élevée.
        with self.client.post(
            "/chat",
            json=payload,
            headers=self.headers,
            name="POST /chat",
            timeout=90,
            catch_response=True,
        ) as resp:
            status = resp.status_code

            if status == 200:
                # Corps SSE complet attendu (doit contenir l'évènement 'done').
                body = resp.text or ""
                if '"type": "done"' in body or "'type': 'done'" in body or "done" in body:
                    resp.success()
                else:
                    resp.failure("Réponse 200 mais flux SSE incomplet (pas de 'done')")
            elif status == 429:
                # Rate limit (très probablement Groq) — catégorisé à part.
                resp.failure("429 Too Many Requests (quota Groq probable)")
            elif status == 401:
                resp.failure("401 Unauthorized (JWT invalide/expiré)")
            elif status == 500:
                # 500 = exception backend : Groq en erreur, ChromaDB, embeddings...
                snippet = (resp.text or "")[:160]
                resp.failure(f"500 erreur backend/LLM/ChromaDB: {snippet}")
            elif status == 0:
                resp.failure("Timeout / connexion refusée")
            else:
                resp.failure(f"HTTP {status}")
