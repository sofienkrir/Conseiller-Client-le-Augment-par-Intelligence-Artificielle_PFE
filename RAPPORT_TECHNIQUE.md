# Rapport Technique — Conseiller Clientèle Augmenté par IA
### Document de préparation à la soutenance technique (Attijari Bank)

> Ce document couvre l'ensemble des choix techniques du projet, **avec les références exactes de fichiers et de fonctions** pour pouvoir répondre à toute question du jury. Il est organisé en : Data Science · Intelligence Artificielle · Développement · Sécurité · Évaluation IA · Questions pièges.

---

## 0. Vue d'ensemble — Architecture en 4 couches

| Couche | Technologie | Fichiers clés |
|---|---|---|
| Présentation | React 18 + Vite | `attijari_chatbot/src/App.jsx`, `Admindashboard.jsx` |
| Métier (API) | FastAPI asynchrone | `api/app.py`, `api/routes.py` |
| Intelligence Artificielle | RAG + embedding + LLM | `chatbot.py`, `build_vector_store.py` |
| Persistance | MongoDB + ChromaDB | `./chroma_db/`, collections Mongo |

**Sécurité transversale** : JWT, 2FA, RBA, chiffrement Fernet, device tracking.

---

# PARTIE 1 — DATA SCIENCE

## 1.1 Collecte des données (Web Scraping)

**Où :** dossier `scraper/` (`base_scraper.py`, `particulier.py`, `categories/*.py`)
**Outils :** `Requests` + `BeautifulSoup`

**Pourquoi Requests/BeautifulSoup et pas Scrapy ?**
- Volume limité (~100 fiches produits), structure HTML simple
- Scrapy serait surdimensionné (framework lourd, orienté crawl massif)

**Résultat :** ~100 fiches produits structurées en JSON, réparties sur 8 catégories
→ `data/raw/*.json` puis nettoyées dans `data/processed/*_clean.json`

## 1.2 Nettoyage et structuration

**Où :** `clean_data.py` → produit `data/processed/corpus_clean.json`
- Suppression des balises HTML, normalisation des espaces
- Structuration par : `titre`, `theme`, `description`, `category`, `source`, `url`

## 1.3 Corpus parallèle Derja-Français-Mix (le cœur Data Science)

**Le problème :** les modèles d'embedding multilingues comprennent mal le dialecte tunisien.
- Test initial : similarité cosinus FR↔Derja = **0,32** (insuffisant)

**La solution :** construction manuelle d'un corpus parallèle de **847 paires** (V2)
- Chaque entrée = 1 question FR canonique + 1 version Derja + 1 version Mix (code-switching)
- 8 catégories métier équilibrées
- V1 = 800 paires → V2 = 847 paires (après analyse d'erreurs)

**Pourquoi un corpus parallèle ?** Pour le **fine-tuning par apprentissage contrastif** : rapprocher dans l'espace vectoriel les formulations équivalentes en FR et en Derja.

## 1.4 Fine-tuning du modèle d'embedding

**Modèle de base :** `paraphrase-multilingual-MiniLM-L12-v2` (118M paramètres, 384 dimensions)
**Modèle final :** `./models/attijari-model-v2`
**Technique :** apprentissage contrastif avec **MultipleNegativesRankingLoss** (Sentence-Transformers)

**Comment ça marche (MultipleNegativesRankingLoss) :**
- Pour chaque paire (FR, Derja) considérée comme positive, toutes les autres paires du batch servent de négatifs
- Le modèle apprend à rapprocher les positifs et éloigner les négatifs
- Avantage : pas besoin de négatifs étiquetés manuellement

**Résultat :** similarité cosinus FR↔Derja passe de **0,32 → 0,96**

**Pourquoi MiniLM-L12-v2 et pas un modèle plus gros ?**
| Modèle | Params | Dim | Latence CPU | Retenu |
|---|---|---|---|---|
| **MiniLM-L12-v2** | 118M | 384 | Rapide | ✅ |
| mpnet-base-v2 | 278M | 768 | Moyenne | ❌ |
| LaBSE | 470M | 768 | Lente | ❌ |
| XLM-RoBERTa | 270M | 768 | Moyenne | ❌ |

→ MiniLM offre le meilleur compromis qualité/latence, exécutable en **CPU** (pas de GPU requis en production).

## 1.5 Génération de données clients fictives

**Où :** `generate_fake_clients.py` → 30 profils clients réalistes
**Pourquoi fictives ?** Confidentialité — aucune donnée client réelle utilisée
**Règles métier codées :** revenus conditionnés par profession, produits selon éligibilité, transactions cohérentes, alertes ciblées

---

# PARTIE 2 — INTELLIGENCE ARTIFICIELLE

## 2.1 Architecture RAG (Retrieval-Augmented Generation)

**Fichier central :** `chatbot.py`

**Pourquoi RAG et pas fine-tuner le LLM sur les données ?**
1. **Confidentialité** : le fine-tuning incorpore les données dans les poids (irréversible). Le RAG garde les données dans une base contrôlée, transmises seulement au moment d'une requête.
2. **Fraîcheur** : on peut mettre à jour le catalogue sans réentraîner le modèle.
3. **Traçabilité** : on peut afficher les sources exactes utilisées.

## 2.2 Le pipeline complet — fonction `answer_question()`

**Où :** `chatbot.py:451`

Étapes (dans l'ordre du code) :
1. `get_llm("french")` → toujours répondre en français (`chatbot.py:467`)
2. Détection Derja : `is_derja(query)` (`chatbot.py:478`)
3. Si Derja → réécriture FR via `detect_category_and_rewrite()` (`chatbot.py:479`)
4. Recherche : `hybrid_search()` (`chatbot.py:484`)
5. Construction du prompt + appel LLM via LangChain (`chatbot.py:508`)
6. Post-traitement anti-contradiction (`chatbot.py:522`)

## 2.3 Détection automatique du Derja

**Où :** `is_derja()` `chatbot.py:231`

```python
def is_derja(text):
    if any('؀' <= c <= 'ۿ' for c in text):  # caractères arabes
        return True
    t = text.lower()
    return sum(1 for m in _DERJA_MARKERS if m in t) >= 1  # marqueurs arabizi
```

**Deux méthodes de détection :**
- Plage Unicode arabe (caractères arabes directs)
- Liste de marqueurs arabizi (`3al`, `nheb`, `bech`, `kifech`, `mta3`...)

## 2.4 Recherche hybride

**Où :** `hybrid_search()` `chatbot.py:258`

**Combine deux signaux :**
1. **Recherche sémantique** (vectorielle) : `vectorstore.similarity_search()` sur la version FR réécrite
2. **Recherche par mots-clés** (BM25-like) : score sur `titre` (×3), `theme` (×2), `content` (×1) — `chatbot.py:315-322`

**Astuce clé Derja :** la recherche sémantique utilise la **réécriture française** (`semantic_query`), mais les mots-clés utilisent la **question originale** — ainsi un nom de produit comme "Melki" est préservé quelle que soit la langue (`chatbot.py:264-265`).

**Pourquoi hybride et pas seulement sémantique ?**
- Le sémantique seul rate parfois les noms propres exacts (ex: "Crédit Melki")
- Le mot-clé seul rate les reformulations
- L'hybride capture les deux

## 2.5 Modèle de génération — LLaMA-3.3-70B via Groq

**Où :** `get_llm()` `chatbot.py:38`, modèle `llama-3.3-70b-versatile` (`chatbot.py:49`)

**Pourquoi LLaMA-3.3-70B sur Groq ?**
| Critère | LLaMA 3.3 70B | GPT-4 | Mistral Large | Gemini Pro |
|---|---|---|---|---|
| Latence TTFT | **< 1s** (Groq) | 1-2s | 1-2s | 1-3s |
| Coût | **Faible** | Élevé | Moyen | Moyen |
| Souveraineté | **Modèle ouvert** | Fermé | Européen | US |

- **Groq** = infrastructure matérielle spécialisée (LPU) → latence ultra-faible
- Modèle ouvert → possibilité de réinternalisation future
- Streaming SSE token par token pour l'affichage progressif

## 2.6 Agent de synthèse client

**Où :** `generate_client_synthesis()` `api/clients.py:269`
- Combine données structurées MongoDB du client + prompt structuré
- Utilise le même LLM (Groq LLaMA-3.3-70B)
- Produit : profil, situation financière, recommandations produits, points d'attention, objectifs RDV
- Temps moyen : 4-6 secondes (vs 20-30 min manuellement)

## 2.7 Chunking et indexation

**Où :** `load_documents.py` (fonction `chunk_documents`), appelé dans `build_vector_store.py:33`
- **RecursiveCharacterTextSplitter** (LangChain)
- Taille : 500 caractères, chevauchement : 100 caractères
- Privilégie les ruptures naturelles (paragraphes) avant les ruptures arbitraires

**Métadonnées par chunk :** titre, URL, catégorie, segment, source → permettent l'affichage des sources et le filtrage.

---

# PARTIE 3 — DÉVELOPPEMENT

## 3.1 Backend — FastAPI

**Où :** `api/app.py` (point d'entrée), `api/routes.py` (routes principales)

**Pourquoi FastAPI ?**
- Asynchrone natif (`async/await`) → gère de nombreuses connexions concurrentes
- Compatible écosystème Python IA (LangChain, sentence-transformers)
- Validation automatique via Pydantic
- Documentation Swagger auto-générée (`/docs`)

## 3.2 Streaming des réponses (SSE)

**Pourquoi Server-Sent Events et pas WebSocket ?**
- Le besoin est **unidirectionnel** (serveur → client, token par token)
- SSE est plus simple que WebSocket, fonctionne sur HTTP standard
- Reconnexion automatique native

## 3.3 Filtrage intelligent des sources

**Où :** `build_sources()` `api/routes.py`
- Ne montre que les sources dont les mots-clés du titre apparaissent **réellement dans la réponse générée**
- Filtre les mots vides (NOISE set)
- Garantit une traçabilité fidèle (pas de sources "décoratives")

## 3.4 Frontend — React + Vite

**Où :** `attijari_chatbot/src/`
**Pourquoi React + Vite ?**
- Vite = build ultra-rapide, hot-reload instantané
- React = composants réutilisables, gestion d'état via hooks
- Routing manuel léger via `pushState` (pas besoin de React Router pour ce périmètre)

## 3.5 Persistance — pourquoi 2 bases ?

| Base | Rôle | Pourquoi |
|---|---|---|
| **MongoDB** | Données métier (users, conversations, RDV, clients, évaluations) | NoSQL flexible, documents JSON, schémas évolutifs |
| **ChromaDB** | Index vectoriel (embeddings) | Spécialisée recherche par similarité, filtrage métadonnées, intégration LangChain native |

**Pourquoi ChromaDB et pas Pinecone/Weaviate/FAISS ?**
- ChromaDB : gratuit, local sur disque, filtrage métadonnées, intégration LangChain native
- Pinecone : payant, cloud only
- FAISS : pas de filtrage métadonnées riche

## 3.6 Système de rendez-vous

**Où :** `api/appointments.py`, `api/appointment_routes.py`
- Génération dynamique des créneaux : `generate_slots_for_date()` (jours ouvrés, 9h-17h, 30 min)
- Workflow multi-états : `pending`, `confirmed`, `rejected`, `alternative_proposed`, `cancelled`, `cancelled_by_advisor`
- Reprogrammation avec 2-3 créneaux : `propose_multiple_alternatives()`
- Cohérence transactionnelle : vérification anti-double-réservation

---

# PARTIE 4 — SÉCURITÉ

## 4.1 Authentification JWT

**Où :** `api/auth_routes.py`, `api/auth_db.py`
- Jeton signé serveur, transmis dans l'en-tête `Authorization: Bearer`
- Stateless → scalabilité horizontale
- 2 rôles : `user` (client) et `admin`

## 4.2 Double authentification (2FA)

**Où :** `api/two_factor.py`, `api/email_service.py` (`send_2fa_code`)
- Code à 6 chiffres, **empreinte SHA-256** stockée (jamais le code en clair)
- Expiration 10 minutes, usage unique
- Envoi via SMTP Gmail
- Mécanisme "Trust this device" : cookie httpOnly signé, 30 jours
- **Conforme PSD2** (Strong Customer Authentication : connaissance + possession)

## 4.3 Risk-Based Authentication (RBA)

**Où :** `api/risk_scoring.py` (`calculate_login_risk`), `api/device_tracking.py`

**8 facteurs de risque (scores actualisés) :**
| Facteur | Points |
|---|---|
| Nouvel appareil | +25 |
| Nouvelle ville | +15 |
| Nouveau pays | +35 |
| Heure inhabituelle (2h-6h) | +10 |
| Échecs 2FA récents (≥3/30min) | +35 |
| Saut géographique impossible | +50 |
| Appareil partagé | +25 |
| User-Agent suspect | +35 |

**4 niveaux d'action :**
| Score | Niveau | Action |
|---|---|---|
| 0-20 | LOW | Log seulement |
| 21-50 | MEDIUM | Email info |
| 51-80 | HIGH | Email alerte + bouton "Ce n'était pas moi" |
| 81+ | CRITICAL | Blocage + invalidation sessions |

**Empreinte appareil :** `compute_device_fingerprint()` `api/device_tracking.py:46`
- SHA-256 de (IP_subnet + navigateur+OS+type)
- Tolérant aux IP dynamiques (3 premiers octets seulement)

## 4.4 Chiffrement applicatif Fernet

**Où :** `api/crypto_utils.py`, migration `scripts/encrypt_existing_clients.py`
- **Fernet = AES-128 CBC + HMAC-SHA256**
- Champs chiffrés : téléphone, date naissance, revenus, solde, capital, mensualité, montant
- Champs en clair (à dessein) : email, nom, ville (pour recherche admin)
- Script avec 3 modes : `dry-run`, `apply`, `rollback`

## 4.5 Mécanisme "Ce n'était pas moi"

**Où :** `api/auth_routes.py` (route `/auth/report-not-me`)
- Token **HMAC-SHA256** signé, valide 48h, **usage unique** (index TTL MongoDB)
- Effets : révocation device + invalidation sessions + suppression devices de confiance + `must_reset_password` + incident enregistré + email confirmation
- Polling frontend toutes les 15s pour déconnexion forcée

---

# PARTIE 5 — ÉVALUATION DE LA QUALITÉ IA

## 5.1 Auto-score (synchrone, <50ms)

**Où :** `compute_auto_score()` `api/evaluation.py:48`

**4 métriques pondérées :**
| Métrique | Poids | Calcul |
|---|---|---|
| Groundedness | 45% | % mots réponse présents dans sources |
| Source Citation | 25% | nb sources citées (2-4 = idéal) |
| Coverage | 15% | % sources utilisées / récupérées |
| Length Consistency | 15% | ratio longueur réponse/question |

Score 0-10 → **÷2 = étoiles affichées**
Niveaux : ELEVE (≥7,5) / MOYEN (5-7,5) / FAIBLE (<5)

## 5.2 LLM-as-Judge (asynchrone)

**Où :** `api/llm_judge.py`, modèle `gemini-2.5-flash` (`llm_judge.py:27`)

**Pourquoi un 2e LLM (Gemini) pour juger LLaMA ?**
- Évaluateur indépendant → moins de biais d'auto-complaisance
- Technique reconnue dans la littérature (LLM-as-a-Judge)
- Gemini Flash = rapide et gratuit
- S'exécute en **async** (background) pour ne pas ralentir l'utilisateur

**4 critères :** Véracité (40%), Pertinence (30%), Clarté (15%), Conformité linguistique (15%)
**3 flags de danger :** hallucination, données_inventées, recommandation_risquée

---

# PARTIE 6 — QUESTIONS PIÈGES PROBABLES

**Q : Pourquoi pas un simple chatbot avec GPT-4 directement ?**
> GPT-4 seul hallucinerait sur les produits Attijari (il ne les connaît pas). Le RAG ancre les réponses dans le catalogue réel. De plus, GPT-4 est coûteux et fermé.

**Q : Comment garantissez-vous que le chatbot ne ment pas ?**
> Trois garde-fous : (1) RAG ancre les réponses sur les sources, (2) filtrage des sources affichées, (3) double évaluation auto-score + LLM-Judge qui flague les hallucinations.

**Q : Pourquoi le score de fiabilité est parfois bas alors que la réponse est correcte ?**
> L'auto-score est optimisé pour les questions RAG sur le catalogue. Pour les questions sur données client (chat contextualisé), la réponse vient de MongoDB, ce qui pénalise le Groundedness. C'est une limite identifiée.

**Q : Que se passe-t-il si Groq tombe en panne ?**
> Limite actuelle : dépendance API externe. Perspective : multi-provider (bascule Groq → Gemini → Mistral).

**Q : Le dialecte tunisien, comment vous le gérez vraiment ?**
> Détection automatique (`is_derja`), réécriture FR pour la recherche sémantique, conservation de l'original pour les mots-clés. Le modèle d'embedding a été fine-tuné spécifiquement (0,32 → 0,96 de similarité).

**Q : Vos données clients sont-elles protégées ?**
> Oui : chiffrement Fernet AES-128 des champs sensibles, RAG (pas de données dans les poids du modèle), 2FA, RBA, contrôle d'accès par rôle.

**Q : Pourquoi 384 dimensions et pas 768 ?**
> Compromis qualité/performance. 384 dim = modèle plus léger, exécutable CPU, latence faible, suffisant après fine-tuning (0,96 de similarité atteint).

---

## Récapitulatif des fichiers à connaître par cœur

| Sujet | Fichier:fonction |
|---|---|
| Pipeline RAG | `chatbot.py:451` `answer_question()` |
| Recherche hybride | `chatbot.py:258` `hybrid_search()` |
| Détection Derja | `chatbot.py:231` `is_derja()` |
| LLM génération | `chatbot.py:38` `get_llm()` |
| Vector store | `build_vector_store.py` |
| Agent synthèse | `api/clients.py:269` `generate_client_synthesis()` |
| Auto-score | `api/evaluation.py:48` `compute_auto_score()` |
| LLM-Judge | `api/llm_judge.py` |
| RBA | `api/risk_scoring.py` `calculate_login_risk()` |
| Empreinte appareil | `api/device_tracking.py:46` |
| Chiffrement | `api/crypto_utils.py` |
| Sources filtrées | `api/routes.py` `build_sources()` |
