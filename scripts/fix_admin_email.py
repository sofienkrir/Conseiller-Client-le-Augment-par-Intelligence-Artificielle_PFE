"""
Fix admin account blocked by invalid 2FA email.
Sets two_fa_email to a real working address so 2FA codes can be received.
"""
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(override=True)

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["attijari_chatbot"]

# Show current admin accounts
print("=== Comptes admin actuels ===")
admins = list(db.users.find({"is_admin": True}, {"email": 1, "nom": 1, "prenom": 1, "two_fa_email": 1}))
for i, u in enumerate(admins):
    tfa = u.get("two_fa_email", "non défini")
    print(f"  [{i}] {u.get('prenom','')} {u.get('nom','')} — {u['email']} | 2FA email: {tfa}")

if not admins:
    print("Aucun admin trouvé.")
    client.close()
    exit()

# Update the admin's two_fa_email to a real address
REAL_EMAIL = "sofienkrir11@gmail.com"

result = db.users.update_many(
    {"is_admin": True},
    {"$set": {"two_fa_email": REAL_EMAIL}}
)

print(f"\n✓ {result.modified_count} admin(s) mis à jour → two_fa_email = {REAL_EMAIL}")
print("  Le code 2FA sera maintenant envoyé à cette adresse.")
client.close()
