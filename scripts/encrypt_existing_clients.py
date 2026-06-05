#!/usr/bin/env python3
"""
Migration: chiffrement des donnees client sensibles (Fernet AES-128).

Usage:
    python scripts/encrypt_existing_clients.py --dry-run   (defaut, sans modification)
    python scripts/encrypt_existing_clients.py --apply     (chiffrement reel)
    python scripts/encrypt_existing_clients.py --rollback  (dechiffrement, retour etat initial)

Idempotent: les documents deja chiffres (_encrypted=true) sont ignores.
Un backup JSON est cree automatiquement dans backups/ avant toute modification.
"""

import sys
import os
import json
import argparse
from datetime import datetime
from pathlib import Path

# Permettre l'import depuis la racine du projet
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = "attijari_chatbot"
BACKUPS   = ROOT / "backups"
BACKUPS.mkdir(exist_ok=True)


# ── Serialisation JSON MongoDB-safe ──────────────────────────────────────────

class _MongoEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


# ── Helpers affichage ASCII-safe (Windows cp1252) ────────────────────────────

def _hr(char="-", width=60):
    print(char * width)

def _ok(msg):  print(f"  [OK]   {msg}")
def _skip(msg): print(f"  [SKIP] {msg}")
def _err(msg):  print(f"  [ERR]  {msg}")
def _info(msg): print(f"  [INFO] {msg}")


# ── Backup ────────────────────────────────────────────────────────────────────

def _backup(db) -> Path:
    ts   = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = BACKUPS / f"clients_BEFORE_ENCRYPTION_{ts}.json"
    docs = list(db.clients.find({}))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(docs, f, cls=_MongoEncoder, ensure_ascii=False, indent=2)
    return path


# ── Mode --apply ──────────────────────────────────────────────────────────────

def run_encrypt(db, dry_run: bool):
    from api.crypto_utils import encrypt_client_doc, SENSITIVE_FIELDS, \
                                  PRODUCT_SENSITIVE_FIELDS, TRANSACTION_SENSITIVE_FIELDS

    _hr("=")
    mode = "DRY-RUN (aucune modification)" if dry_run else "APPLY (chiffrement reel)"
    print(f"  Chiffrement clients -- Mode: {mode}")
    _hr("=")

    total    = db.clients.count_documents({})
    already  = db.clients.count_documents({"_encrypted": True})
    to_do    = total - already

    _info(f"Total clients     : {total}")
    _info(f"Deja chiffres     : {already}")
    _info(f"A chiffrer        : {to_do}")
    print()

    if to_do == 0:
        _info("Rien a faire — tous les clients sont deja chiffres.")
        return

    # Backup avant toute modification
    if not dry_run:
        backup_path = _backup(db)
        _info(f"Backup cree       : {backup_path}")
        print()

    chiffres = 0
    erreurs  = 0

    cursor = db.clients.find({"_encrypted": {"$ne": True}})
    for doc in cursor:
        client_id   = doc["_id"]
        label       = f"{doc.get('prenom','')} {doc.get('nom','')} ({doc.get('client_code','')})"

        try:
            encrypted_doc = encrypt_client_doc(doc)
            # Supprimer _id pour l'update (pas modifiable)
            update_fields = {k: v for k, v in encrypted_doc.items() if k != "_id"}

            if dry_run:
                # Afficher un apercu des champs qui seraient chiffres
                changed = []
                for f in SENSITIVE_FIELDS:
                    if f in doc and doc[f] is not None:
                        changed.append(f)
                prod_changed = sum(
                    1 for p in doc.get("produits", [])
                    for pf in PRODUCT_SENSITIVE_FIELDS if pf in p
                )
                tx_changed = sum(
                    1 for t in doc.get("transactions_recentes", [])
                    for tf in TRANSACTION_SENSITIVE_FIELDS if tf in t
                )
                summary = ", ".join(changed)
                if prod_changed:
                    summary += f", produits[{prod_changed} champs]"
                if tx_changed:
                    summary += f", transactions[{tx_changed} montants]"
                _info(f"[DRY] {label}: {summary}")
            else:
                db.clients.update_one(
                    {"_id": client_id},
                    {"$set": update_fields}
                )
                _ok(label)

            chiffres += 1

        except Exception as e:
            _err(f"{label}: {e}")
            erreurs += 1

    print()
    _hr("=")
    if dry_run:
        print(f"  [DRY-RUN] {chiffres} document(s) seraient chiffres")
        print(f"  Relancez avec --apply pour appliquer.")
    else:
        print(f"  Chiffres          : {chiffres}")
        print(f"  Erreurs           : {erreurs}")
    _hr("=")


# ── Mode --rollback ───────────────────────────────────────────────────────────

def run_rollback(db, dry_run: bool):
    from api.crypto_utils import decrypt_client_doc

    _hr("=")
    mode = "DRY-RUN" if dry_run else "APPLY (dechiffrement reel)"
    print(f"  Rollback dechiffrement -- Mode: {mode}")
    _hr("=")

    total    = db.clients.count_documents({"_encrypted": True})
    _info(f"Documents chiffres a dechiffrer : {total}")
    print()

    if total == 0:
        _info("Rien a faire — aucun document chiffre.")
        return

    if not dry_run:
        backup_path = _backup(db)
        _info(f"Backup cree : {backup_path}")
        print()

    decrypted = 0
    erreurs   = 0

    for doc in db.clients.find({"_encrypted": True}):
        client_id = doc["_id"]
        label     = f"{doc.get('prenom','')} {doc.get('nom','')} ({doc.get('client_code','')})"
        try:
            clear_doc = decrypt_client_doc(doc)
            update_fields = {k: v for k, v in clear_doc.items() if k != "_id"}
            update_fields.pop("_encrypted", None)

            if dry_run:
                _info(f"[DRY] Serait dechiffre: {label}")
            else:
                db.clients.update_one(
                    {"_id": client_id},
                    {"$set": update_fields, "$unset": {"_encrypted": ""}}
                )
                _ok(f"Dechiffre: {label}")
            decrypted += 1
        except Exception as e:
            _err(f"{label}: {e}")
            erreurs += 1

    print()
    _hr("=")
    if dry_run:
        print(f"  [DRY-RUN] {decrypted} document(s) seraient dechiffres.")
    else:
        print(f"  Dechiffres : {decrypted}")
        print(f"  Erreurs    : {erreurs}")
    _hr("=")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Chiffrement Fernet des donnees clients")
    group  = parser.add_mutually_exclusive_group()
    group.add_argument("--dry-run",  action="store_true", default=True,
                       help="Afficher les changements sans modifier (defaut)")
    group.add_argument("--apply",    action="store_true",
                       help="Appliquer le chiffrement")
    group.add_argument("--rollback", action="store_true",
                       help="Dechiffrer (rollback)")
    args = parser.parse_args()

    mongo  = MongoClient(MONGO_URI)
    db     = mongo[DB_NAME]

    try:
        if args.rollback:
            dry = not args.rollback  # False si --rollback seul
            # Demander confirmation
            print()
            print("  ATTENTION: Le rollback dechiffre les donnees en clair dans MongoDB.")
            print("  Tapez 'OUI' pour confirmer: ", end="")
            confirm = input().strip()
            if confirm != "OUI":
                print("  Annule.")
                return
            run_rollback(db, dry_run=False)
        elif args.apply:
            run_encrypt(db, dry_run=False)
        else:
            run_encrypt(db, dry_run=True)
    finally:
        mongo.close()


if __name__ == "__main__":
    main()
