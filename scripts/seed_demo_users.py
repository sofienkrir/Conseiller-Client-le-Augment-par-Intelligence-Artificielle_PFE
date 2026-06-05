#!/usr/bin/env python3
"""
Seed de 2 comptes demo lies aux clients ATB-2026-0001 et ATB-2026-0002.

Usage:
    python scripts/seed_demo_users.py

Idempotent: si les comptes existent deja, ils sont ignores.
Credentials demo:
    sofien.demo@attijari.com / Demo1234!   -> ATB-2026-0001
    aziz.demo@attijari.com   / Demo1234!   -> ATB-2026-0002
"""

import sys
import os
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from passlib.context import CryptContext
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = "attijari_chatbot"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_ACCOUNTS = [
    {"email": "sofien.demo@attijari.com", "password": "Demo1234!", "client_code": "ATB-2026-0001"},
    {"email": "aziz.demo@attijari.com",   "password": "Demo1234!", "client_code": "ATB-2026-0002"},
]


def run() -> None:
    print()
    print("=" * 58)
    print("  Seed comptes demo -- Attijari Bank")
    print("=" * 58)

    client = MongoClient(MONGO_URI)
    db     = client[DB_NAME]

    # Verifier que la migration client_code est faite
    coded = db.clients.count_documents({"client_code": {"$exists": True}})
    if coded == 0:
        print()
        print("  [ERREUR] Aucun client n'a de client_code.")
        print("  Executez d'abord: python scripts/migrate_client_codes.py")
        client.close()
        sys.exit(1)

    print(f"\n  Clients avec client_code: {coded}")
    print()

    created = 0
    skipped = 0

    for acc in DEMO_ACCOUNTS:
        code = acc["client_code"]
        email = acc["email"]

        # Recuperer le client lie
        client_doc = db.clients.find_one({"client_code": code})
        if not client_doc:
            print(f"  [SKIP] {email} -> client {code} introuvable")
            skipped += 1
            continue

        # Verifier si un user avec cet email existe deja
        if db.users.find_one({"email": email}):
            print(f"  [SKIP] {email} -> compte deja existant")
            skipped += 1
            continue

        # Verifier si ce client_code est deja utilise
        if db.users.find_one({"client_code": code}):
            existing = db.users.find_one({"client_code": code})
            print(f"  [SKIP] {code} -> deja lie a {existing.get('email')}")
            skipped += 1
            continue

        # Creer le user
        user_doc = {
            "nom":           client_doc.get("nom", ""),
            "prenom":        client_doc.get("prenom", ""),
            "email":         email,
            "telephone":     client_doc.get("telephone"),
            "segment":       client_doc.get("segment", "particulier"),
            "client_code":   code,
            "client_id":     client_doc["_id"],
            "password_hash": pwd_context.hash(acc["password"]),
            "created_at":    datetime.utcnow(),
            "updated_at":    datetime.utcnow(),
            "is_active":     True,
            "is_admin":      False,
        }

        try:
            db.users.insert_one(user_doc)
            print(f"  [OK]   {email} / {acc['password']}"
                  f"  ->  {code}  ({client_doc.get('prenom')} {client_doc.get('nom')})")
            created += 1
        except DuplicateKeyError:
            print(f"  [SKIP] {email} -> conflit (email ou client_code deja utilise)")
            skipped += 1

    print()
    print("=" * 58)
    print(f"  Comptes crees : {created}")
    print(f"  Ignores       : {skipped}")
    print("=" * 58)

    if created > 0:
        print()
        print("  Credentials demo:")
        for acc in DEMO_ACCOUNTS:
            c = db.clients.find_one({"client_code": acc["client_code"]})
            name = f"{c.get('prenom','')} {c.get('nom','')}" if c else "?"
            print(f"    {acc['email']}  /  {acc['password']}  ({name})")
        print()
        print("  Code disponible pour demo live (signup):  ATB-2026-0003")
        print()

    client.close()


if __name__ == "__main__":
    run()
