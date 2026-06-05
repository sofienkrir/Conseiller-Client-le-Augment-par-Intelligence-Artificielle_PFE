from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(override=True)

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["attijari_chatbot"]

OLD = "sofien.demo@attijari.com"
NEW = "sofienkrir11@gmail.com"

result = db.users.update_one({"email": OLD}, {"$set": {"email": NEW}})
print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")

user = db.users.find_one({"email": NEW}, {"email": 1, "nom": 1, "prenom": 1})
print(f"Utilisateur: {user}")
client.close()
