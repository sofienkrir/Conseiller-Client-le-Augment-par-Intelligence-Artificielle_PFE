# api/trusted_devices.py
"""
Gestion des appareils de confiance (Trust Device 30 jours).
Le device_token est stocke en cookie httpOnly cote client.
"""

import os
import uuid
from datetime import datetime, timedelta

from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv(override=True)

MONGO_URI    = os.getenv("MONGO_URI", "mongodb://localhost:27017")
TRUST_DAYS   = int(os.getenv("TRUSTED_DEVICE_DAYS", "30"))

_client = MongoClient(MONGO_URI)
_db     = _client["attijari_chatbot"]
_col    = _db["trusted_devices"]

# TTL index — expiration automatique
_col.create_index("expires_at", expireAfterSeconds=0, name="ttl_trusted_devices")
# Index de recherche rapide par token
_col.create_index("device_token", unique=True, name="uq_device_token")
# Index par user
_col.create_index("user_id", name="idx_user_id")


def add_trusted_device(
    user_id: str,
    user_agent: str = "",
    ip_address: str = "",
) -> str:
    """
    Enregistre un appareil de confiance pour 30 jours.
    Retourne le device_token a stocker dans un cookie httpOnly.
    """
    token      = str(uuid.uuid4())
    now        = datetime.utcnow()
    expires_at = now + timedelta(days=TRUST_DAYS)

    _col.insert_one({
        "user_id":      ObjectId(user_id),
        "device_token": token,
        "user_agent":   user_agent,
        "ip_address":   ip_address,
        "trusted_at":   now,
        "expires_at":   expires_at,
        "last_used_at": now,
    })
    return token


def is_device_trusted(
    user_id: str,
    device_token: str,
    user_agent: str = "",
) -> bool:
    """
    Verifie si un appareil est digne de confiance.
    Met a jour last_used_at si valide.
    """
    if not device_token:
        return False
    try:
        doc = _col.find_one({
            "device_token": device_token,
            "user_id":      ObjectId(user_id),
        })
    except Exception:
        return False

    if not doc:
        return False

    if datetime.utcnow() > doc["expires_at"]:
        return False

    # Mise a jour de la derniere utilisation
    _col.update_one(
        {"device_token": device_token},
        {"$set": {"last_used_at": datetime.utcnow()}}
    )
    return True


def revoke_trusted_device(device_token: str) -> bool:
    """Revoque un appareil de confiance (utilise a la deconnexion)."""
    if not device_token:
        return False
    result = _col.delete_one({"device_token": device_token})
    return result.deleted_count > 0


def revoke_all_user_devices(user_id: str) -> int:
    """Revoque tous les appareils d'un utilisateur (securite)."""
    result = _col.delete_many({"user_id": ObjectId(user_id)})
    return result.deleted_count
