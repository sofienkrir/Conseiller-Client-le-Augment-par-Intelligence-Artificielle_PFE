from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(override=True)

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["attijari_chatbot"]

print("=== Comptes utilisateurs ===")
for u in db.users.find({}, {"email": 1, "nom": 1, "prenom": 1, "is_admin": 1, "client_code": 1}):
    role = "ADMIN" if u.get("is_admin") else "client"
    print(f"  [{role}] {u.get('prenom','')} {u.get('nom','')} — {u['email']} (code: {u.get('client_code','N/A')})")
client.close()
