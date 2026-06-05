# api/two_factor.py
"""
Gestion des sessions 2FA.

Collection MongoDB: auth_codes
- TTL index sur expires_at (auto-delete apres expiration)
- Code stocke en SHA-256 (JAMAIS en clair)
- Limite de tentatives anti brute-force
"""

import os
import uuid
import secrets
import hashlib
from datetime import datetime, timedelta

from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv(override=True)

MONGO_URI       = os.getenv("MONGO_URI", "mongodb://localhost:27017")
EXPIRY_MINUTES  = int(os.getenv("TWO_FA_CODE_EXPIRY_MINUTES", "10"))
MAX_ATTEMPTS    = int(os.getenv("TWO_FA_MAX_ATTEMPTS", "5"))
MAX_RESEND      = 3   # resend max par session

_client = MongoClient(MONGO_URI)
_db     = _client["attijari_chatbot"]
_col    = _db["auth_codes"]

# Index TTL — MongoDB supprime automatiquement les docs expires
_col.create_index("expires_at", expireAfterSeconds=0, name="ttl_expires_at")
# Index de recherche par session_id
_col.create_index("session_id", unique=True, name="uq_session_id")


# ════════════════════════════════════════════════════
# Primitives cryptographiques
# ════════════════════════════════════════════════════

def generate_code() -> str:
    """Code 6 chiffres cryptographiquement sur — utilise secrets, pas random."""
    return "".join(secrets.choice("0123456789") for _ in range(6))


def hash_code(code: str) -> str:
    """SHA-256 du code. Stocke uniquement ce hash en base."""
    return hashlib.sha256(code.encode()).hexdigest()


# ════════════════════════════════════════════════════
# Cycle de vie d'une session 2FA
# ════════════════════════════════════════════════════

def create_2fa_session(
    user_id: str,
    email: str,
    ip_address: str = "",
    user_agent: str = "",
) -> dict:
    """
    Cree une nouvelle session 2FA.
    Retourne { session_id, code, expires_at }.
    Le code est retourne UNE SEULE FOIS pour etre envoye par email.
    Il n'est JAMAIS stocke en clair en base.
    """
    code       = generate_code()
    session_id = str(uuid.uuid4())
    now        = datetime.utcnow()
    expires_at = now + timedelta(minutes=EXPIRY_MINUTES)

    doc = {
        "user_id":    ObjectId(user_id),
        "email":      email,
        "code_hash":  hash_code(code),
        "attempts":   0,
        "resend_count": 0,
        "created_at": now,
        "expires_at": expires_at,
        "used":       False,
        "session_id": session_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
    }
    _col.insert_one(doc)

    return {
        "session_id": session_id,
        "code":       code,         # transmis vers email_service, jamais logue
        "expires_at": expires_at.isoformat(),
        "expiry_minutes": EXPIRY_MINUTES,
    }


def verify_code(session_id: str, code: str) -> dict:
    """
    Verifie un code 2FA.
    Retourne:
      { "valid": True }
      { "valid": False, "reason": "...", "attempts_left": N }
      { "valid": False, "reason": "blocked" }
      { "valid": False, "reason": "expired" }
    """
    session = _col.find_one({"session_id": session_id})

    if not session:
        return {"valid": False, "reason": "Session introuvable ou expiree"}

    if session.get("used"):
        return {"valid": False, "reason": "Code deja utilise"}

    if datetime.utcnow() > session["expires_at"]:
        return {"valid": False, "reason": "Code expire. Recommencez la connexion."}

    if session.get("attempts", 0) >= MAX_ATTEMPTS:
        return {"valid": False, "reason": "blocked", "attempts_left": 0}

    if hash_code(code) == session["code_hash"]:
        # Code correct — marquer comme utilise
        _col.update_one(
            {"session_id": session_id},
            {"$set": {"used": True}}
        )
        return {"valid": True, "user_id": str(session["user_id"])}

    # Code incorrect — incrementer les tentatives
    new_attempts = session.get("attempts", 0) + 1
    _col.update_one(
        {"session_id": session_id},
        {"$set": {"attempts": new_attempts}}
    )
    attempts_left = MAX_ATTEMPTS - new_attempts
    if attempts_left <= 0:
        return {"valid": False, "reason": "blocked", "attempts_left": 0}
    return {
        "valid": False,
        "reason": "Code incorrect",
        "attempts_left": attempts_left,
    }


def resend_code(session_id: str) -> dict:
    """
    Genere un nouveau code pour une session existante (pas encore expiree).
    Retourne { session_id, code, expires_at } ou { error: ... }.
    Limite: MAX_RESEND renvois par session.
    """
    session = _col.find_one({"session_id": session_id})

    if not session:
        return {"error": "Session introuvable"}

    if session.get("used"):
        return {"error": "Session deja validee"}

    if datetime.utcnow() > session["expires_at"]:
        return {"error": "Session expiree. Reconnectez-vous."}

    if session.get("resend_count", 0) >= MAX_RESEND:
        return {"error": f"Maximum de {MAX_RESEND} renvois atteint. Reconnectez-vous."}

    # Nouveau code + reset tentatives + prolonger expiration
    new_code   = generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=EXPIRY_MINUTES)

    _col.update_one(
        {"session_id": session_id},
        {"$set": {
            "code_hash":    hash_code(new_code),
            "attempts":     0,
            "expires_at":   expires_at,
            "used":         False,
        },
        "$inc": {"resend_count": 1}}
    )

    return {
        "session_id":     session_id,
        "code":           new_code,    # transmis vers email_service uniquement
        "expires_at":     expires_at.isoformat(),
        "expiry_minutes": EXPIRY_MINUTES,
        "resend_count":   session.get("resend_count", 0) + 1,
    }


def get_session_email(session_id: str) -> str | None:
    """Retourne l'email associe a une session (pour affichage masque cote frontend)."""
    session = _col.find_one({"session_id": session_id}, {"email": 1})
    return session.get("email") if session else None
