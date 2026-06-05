#!/usr/bin/env python3
"""
Reset des users non-admin avant migration KYC client_code.

Usage:
    python scripts/reset_non_admin_users.py              # mode interactif
    python scripts/reset_non_admin_users.py --auto-confirm  # bypass confirmation

Ce script:
  1. Sauvegarde TOUS les users dans backup_users_BEFORE_RESET.json
  2. Affiche la liste des users qui seront supprimes
  3. Demande confirmation
  4. Supprime uniquement les users avec is_admin != True
  5. Preserve les admins intacts
"""

import sys
import os
import json
import argparse
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = "attijari_chatbot"

BACKUP_FILE = os.path.join(os.path.dirname(__file__), "..", "backup_users_BEFORE_RESET.json")


def serialize(doc):
    """Rend un document MongoDB serialisable en JSON."""
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def run(auto_confirm: bool) -> None:
    print()
    print("=" * 62)
    print("  Reset users non-admin -- Migration KYC client_code")
    print("=" * 62)

    client = MongoClient(MONGO_URI)
    db     = client[DB_NAME]
    coll   = db["users"]

    all_users   = list(coll.find({}))
    admins      = [u for u in all_users if u.get("is_admin", False)]
    non_admins  = [u for u in all_users if not u.get("is_admin", False)]

    print(f"\n  Total users en base  : {len(all_users)}")
    print(f"  Admins (preserves)   : {len(admins)}")
    print(f"  Non-admins (a suppr) : {len(non_admins)}")

    # ── Backup ────────────────────────────────────────────────────────────
    backup_path = os.path.abspath(BACKUP_FILE)
    backup_data = {
        "backup_date": datetime.utcnow().isoformat(),
        "total": len(all_users),
        "users": [serialize(u) for u in all_users],
    }
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2)
    print(f"\n  [OK] Backup cree : {backup_path}")

    # ── Liste des admins preserves ────────────────────────────────────────
    print()
    print("  ADMINS PRESERVES:")
    for u in admins:
        print(f"    [KEEP]  {u.get('email')}  ({u.get('nom','')} {u.get('prenom','')})")

    # ── Liste des users a supprimer ───────────────────────────────────────
    print()
    if not non_admins:
        print("  Aucun user non-admin a supprimer. Rien a faire.")
        client.close()
        return

    print("  USERS A SUPPRIMER:")
    for u in non_admins:
        created = u.get("created_at")
        created_str = created.strftime("%Y-%m-%d") if isinstance(created, datetime) else str(created or "?")
        print(f"    [DEL]   {u.get('email')}  ({u.get('nom','')} {u.get('prenom','')})  -- cree le {created_str}")

    # ── Confirmation ──────────────────────────────────────────────────────
    print()
    if auto_confirm:
        print("  [--auto-confirm] Suppression automatique...")
        confirmed = True
    else:
        answer = input(f"  Confirmer la suppression de {len(non_admins)} user(s) non-admin ? (yes/no) : ").strip().lower()
        confirmed = answer == "yes"

    if not confirmed:
        print()
        print("  [ANNULE] Aucune modification effectuee.")
        client.close()
        return

    # ── Suppression ───────────────────────────────────────────────────────
    ids_to_delete = [u["_id"] for u in non_admins]
    result = coll.delete_many({"_id": {"$in": ids_to_delete}})

    print()
    print("=" * 62)
    print("  RESUME")
    print("-" * 62)
    print(f"  Users supprimes  : {result.deleted_count}")
    print(f"  Admins preserves : {len(admins)}")
    print(f"  Backup           : {backup_path}")
    print("=" * 62)
    print()
    print("  Prochaine etape :")
    print("    python scripts/seed_demo_users.py   (optionnel)")
    print("    Redemarrer uvicorn puis tester /auth/register avec client_code")
    print()

    client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset users non-admin avant migration KYC")
    parser.add_argument("--auto-confirm", action="store_true",
                        help="Bypass la confirmation interactive")
    args = parser.parse_args()
    run(auto_confirm=args.auto_confirm)


if __name__ == "__main__":
    main()
