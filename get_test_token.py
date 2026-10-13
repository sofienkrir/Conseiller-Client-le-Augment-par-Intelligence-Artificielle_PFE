"""
get_test_token.py — Génère un JWT valide pour les tests de charge Locust.

Ce script NE MODIFIE PAS la logique métier : il réutilise simplement la fonction
de signature de l'application (AuthDB.create_access_token) pour émettre un token
au nom d'un utilisateur existant. Cela évite de passer par le flux 2FA (email/OTP)
pendant les tests, sans désactiver la 2FA en production.

Usage:
    python get_test_token.py
    python get_test_token.py aziz.demo@attijari.com

Le token est imprimé sur stdout. À placer dans la variable d'environnement CHAT_JWT
avant de lancer Locust (voir commandes dans la doc).
"""

import sys
from api.auth_db import AuthDB, users_collection

DEFAULT_EMAIL = "sofien.demo@attijari.com"


def main() -> int:
    email = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMAIL

    user = users_collection.find_one({"email": email})
    if not user:
        print(f"[ERREUR] Utilisateur introuvable: {email}", file=sys.stderr)
        print("         Lance d'abord:  python scripts/seed_demo_users.py", file=sys.stderr)
        return 1

    # Lecture seule : on n'altère aucun état. On signale juste si le compte est
    # marqué force_relogin (le token serait alors rejeté par l'API).
    if user.get("force_relogin"):
        print(
            f"[ATTENTION] Le compte {email} a force_relogin=True : le token sera "
            f"refusé par /chat. Utilise un autre compte de démo "
            f"(ex: aziz.demo@attijari.com).",
            file=sys.stderr,
        )

    token = AuthDB.create_access_token(
        data={"sub": str(user["_id"]), "email": user["email"]}
    )
    # Uniquement le token sur stdout → facile à capturer dans une variable.
    print(token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
