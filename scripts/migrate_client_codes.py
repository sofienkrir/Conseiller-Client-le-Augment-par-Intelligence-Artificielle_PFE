#!/usr/bin/env python3
"""
Migration: ajoute le champ client_code à tous les clients existants.

Usage:
    python scripts/migrate_client_codes.py --dry-run   # aperçu sans modification
    python scripts/migrate_client_codes.py             # migration réelle

Format généré: ATB-2026-NNNN (ex: ATB-2026-0001 ... ATB-2026-0030)

Idempotent: les clients ayant déjà un client_code sont ignorés.
"""

import sys
import os
import argparse
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError, OperationFailure
from dotenv import load_dotenv

# -- Config ------------------------------------------------------------------
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = "attijari_chatbot"
COLL_NAME = "clients"
YEAR      = 2026
PREFIX    = f"ATB-{YEAR}"


def generate_code(index_1based: int) -> str:
    return f"{PREFIX}-{index_1based:04d}"


def run(dry_run: bool) -> None:
    mode_label = "[DRY-RUN]" if dry_run else "[MIGRATION]"
    print(f"\n{'='*60}")
    print(f"  {mode_label} Migration client_code — {DB_NAME}.{COLL_NAME}")
    print(f"{'='*60}")

    client = MongoClient(MONGO_URI)
    db     = client[DB_NAME]
    coll   = db[COLL_NAME]

    # Compter le total
    total = coll.count_documents({})
    already_coded = coll.count_documents({"client_code": {"$exists": True, "$ne": None}})
    to_process = total - already_coded

    print(f"\n  Total clients      : {total}")
    print(f"  Déjà codifiés      : {already_coded}")
    print(f"  À traiter          : {to_process}")
    print()

    if total == 0:
        print("  [WARN] Aucun client dans la collection. Rien a faire.")
        client.close()
        return

    # Trier par created_at asc, puis _id asc en fallback
    cursor = coll.find({}).sort([("created_at", ASCENDING), ("_id", ASCENDING)])

    generated = 0
    skipped   = 0
    errors    = 0
    counter   = 0  # position globale (pour le NNNN du code)

    for doc in cursor:
        counter += 1
        doc_id = doc["_id"]

        # Déjà codifié → skip
        if doc.get("client_code"):
            skipped += 1
            print(f"  [SKIP] #{counter:02d}  {doc.get('prenom','')} {doc.get('nom','')} "
                  f"-> deja codifie ({doc['client_code']})")
            continue

        code = generate_code(counter)

        if dry_run:
            print(f"  [DRY] #{counter:02d}  {doc.get('prenom','')} {doc.get('nom','')}"
                  f"  ->  client_code = \"{code}\"")
            generated += 1
        else:
            try:
                coll.update_one(
                    {"_id": doc_id},
                    {"$set": {"client_code": code}},
                )
                print(f"  [OK] #{counter:02d}  {doc.get('prenom','')} {doc.get('nom','')} "
                      f"->  {code}")
                generated += 1
            except DuplicateKeyError:
                print(f"  [ERR] #{counter:02d}  code {code} deja utilise (doublon inattendu)")
                errors += 1
            except Exception as exc:
                print(f"  [ERR] #{counter:02d}  {exc}")
                errors += 1

    # -- Index unique ------------------------------------------------------
    print()
    if dry_run:
        print("  [DRY] WOULD CREATE unique index on clients.client_code")
    else:
        try:
            coll.create_index("client_code", unique=True, sparse=True, name="uq_client_code")
            print("  [OK] Index UNIQUE cree (ou deja existant) sur clients.client_code")
        except OperationFailure as exc:
            print(f"  [WARN] Index non cree: {exc}")

    # -- Résumé ------------------------------------------------------------
    print()
    print(f"{'='*60}")
    print(f"  RESUME {mode_label}")
    print(f"{'-'*60}")
    print(f"  Clients traites   : {generated}")
    print(f"  Ignores (existant): {skipped}")
    print(f"  Erreurs           : {errors}")
    if generated > 0:
        first = generate_code(skipped + 1)
        last  = generate_code(skipped + generated)
        print(f"  Codes generes     : {first} -> {last}")
    print(f"{'='*60}\n")

    client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Migration client_code pour Attijari Bank")
    parser.add_argument("--dry-run", action="store_true",
                        help="Affiche les changements sans modifier MongoDB")
    args = parser.parse_args()
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
