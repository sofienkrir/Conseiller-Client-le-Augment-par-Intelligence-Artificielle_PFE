#!/usr/bin/env python3
"""
Script pour promouvoir un utilisateur existant en admin.

Usage:
    python make_admin.py test@gmail.com
    python make_admin.py --remove test@gmail.com   (pour retirer les droits)
    python make_admin.py --list                    (pour lister les admins)
"""

import sys
import os

# Ajouter le répertoire parent au path pour pouvoir importer api/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.auth_db import AuthDB, users_collection


def list_admins():
    """Liste tous les admins."""
    admins = list(users_collection.find({"is_admin": True}, {"email": 1, "nom": 1, "prenom": 1}))
    if not admins:
        print("❌ Aucun admin trouvé.")
        return
    
    print(f"\n✅ {len(admins)} admin(s) trouvé(s):")
    for a in admins:
        print(f"   - {a['email']} ({a.get('prenom', '')} {a.get('nom', '')})")
    print()


def make_admin(email: str, is_admin: bool = True):
    """Promouvoir ou révoquer un user."""
    user = AuthDB.get_user_by_email(email)
    if not user:
        print(f"❌ Utilisateur '{email}' introuvable.")
        print("   Assurez-vous que l'utilisateur est inscrit avant de le promouvoir.")
        return
    
    action = "promu en admin" if is_admin else "rétrogradé (plus admin)"
    
    success = AuthDB.set_admin(email, is_admin)
    if success:
        print(f"✅ Utilisateur '{email}' {action} avec succès!")
        print(f"   Nom: {user.get('prenom', '')} {user.get('nom', '')}")
    else:
        print(f"⚠️ Aucun changement (l'utilisateur était peut-être déjà {action}).")


def main():
    args = sys.argv[1:]
    
    if not args:
        print(__doc__)
        return
    
    if "--list" in args:
        list_admins()
        return
    
    if "--remove" in args:
        email = [a for a in args if a != "--remove"][0] if len(args) > 1 else None
        if not email:
            print("❌ Email requis. Usage: python make_admin.py --remove <email>")
            return
        make_admin(email, is_admin=False)
        return
    
    # Promotion
    email = args[0]
    make_admin(email, is_admin=True)


if __name__ == "__main__":
    main()