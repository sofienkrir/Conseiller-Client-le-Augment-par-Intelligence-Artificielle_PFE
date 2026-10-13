# api/risk_scoring.py
"""
Phase C+ — Risk-Based Authentication (RBA).
Calcule un score de risque pour chaque connexion après 2FA validée.
Conforme PSD2/SCA Article 18 (Transaction Risk Analysis).

Niveaux:
  LOW      (0-20)  → log uniquement
  MEDIUM   (21-50) → email informatif
  HIGH     (51-80) → email d'alerte + bouton "Ce n'était pas moi"
  CRITICAL (81+)   → déconnexion forcée + email URGENT
"""

import os
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv

load_dotenv(override=True)

_client                  = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db                      = _client["attijari_chatbot"]
_devices_col             = _db["user_devices"]
_auth_codes_col          = _db["auth_codes"]
_incidents_col           = _db["security_incidents"]
_used_not_me_tokens_col  = _db["used_not_me_tokens"]

# TTL index — documents auto-supprimés après 48h
_used_not_me_tokens_col.create_index("used_at", expireAfterSeconds=172800, name="ttl_used_not_me")

# ── Poids configurables via .env ──────────────────────────────────────────────
S_NEW_DEVICE    = int(os.getenv("RISK_NEW_DEVICE",    "25"))
S_NEW_CITY      = int(os.getenv("RISK_NEW_CITY",      "15"))
S_NEW_COUNTRY   = int(os.getenv("RISK_NEW_COUNTRY",   "35"))
S_UNUSUAL_HOUR  = int(os.getenv("RISK_UNUSUAL_HOUR",  "10"))
S_FAILED_2FA    = int(os.getenv("RISK_FAILED_2FA",    "35"))
S_GEO_JUMP      = int(os.getenv("RISK_GEO_JUMP",      "50"))
S_SHARED_DEVICE = int(os.getenv("RISK_SHARED_DEVICE", "25"))
S_SUSPICIOUS_UA = int(os.getenv("RISK_SUSPICIOUS_UA", "35"))

_SUSPICIOUS_UA_PATTERNS = [
    "bot", "crawler", "spider", "headless", "phantom",
    "selenium", "puppeteer", "playwright", "curl", "wget",
    "python-requests", "python-urllib", "httpie",
    "java/", "go-http-client", "okhttp", "postman", "insomnia",
]


# ═════════════════════════════════════════════════════════════════════════════
# Fonction principale
# ═════════════════════════════════════════════════════════════════════════════

def calculate_login_risk(
    user_id:           str,
    device_fingerprint: str,
    is_new_device:     bool,
    location:          dict,
    ip:                str,
    user_agent:        str,
    timestamp:         datetime = None,
) -> dict:
    """
    Calcule le score de risque d'une connexion.

    Retourne:
    {
      "score":   int,
      "level":   "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "factors": [{"name", "points", "details", "icon"}, ...],
      "action":  "ALLOW" | "WARN" | "ALERT" | "BLOCK"
    }
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    score   = 0
    factors = []

    # ── 1. Nouveau device (+25) ────────────────────────────────────────────
    if is_new_device:
        score += S_NEW_DEVICE
        factors.append({
            "name":    "new_device",
            "points":  S_NEW_DEVICE,
            "details": "Premier usage de cet appareil",
            "icon":    "🆕",
        })

    # ── 2. Nouvelle ville (+15) ────────────────────────────────────────────
    if check_new_city(user_id, location, exclude_fp=device_fingerprint):
        city = location.get("city") or "inconnue"
        score += S_NEW_CITY
        factors.append({
            "name":    "new_city",
            "points":  S_NEW_CITY,
            "details": f"Nouvelle localisation: {city}",
            "icon":    "📍",
        })

    # ── 3. Nouveau pays (+35) ──────────────────────────────────────────────
    if check_new_country(user_id, location, exclude_fp=device_fingerprint):
        country = location.get("country") or "inconnu"
        score += S_NEW_COUNTRY
        factors.append({
            "name":    "new_country",
            "points":  S_NEW_COUNTRY,
            "details": f"Nouveau pays: {country}",
            "icon":    "🌍",
        })

    # ── 4. Heure inhabituelle (+10) ────────────────────────────────────────
    if check_unusual_hour(user_id, timestamp.hour):
        score += S_UNUSUAL_HOUR
        factors.append({
            "name":    "unusual_hour",
            "points":  S_UNUSUAL_HOUR,
            "details": f"Connexion à {timestamp.hour}h (heure inhabituelle: 2h–6h)",
            "icon":    "🌙",
        })

    # ── 5. Echecs 2FA récents (+35) ────────────────────────────────────────
    failed = check_failed_2fa_attempts(user_id)
    if failed >= 3:
        score += S_FAILED_2FA
        factors.append({
            "name":    "failed_2fa",
            "points":  S_FAILED_2FA,
            "details": f"{failed} tentatives 2FA échouées dans les 30 dernières minutes",
            "icon":    "🔑",
        })

    # ── 6. Saut géographique impossible (+50) ──────────────────────────────
    if check_impossible_geo_jump(user_id, location, timestamp):
        score += S_GEO_JUMP
        factors.append({
            "name":    "geo_jump",
            "points":  S_GEO_JUMP,
            "details": "Déplacement physiquement impossible (< 2h entre pays différents)",
            "icon":    "✈️",
        })

    # ── 7. Device partagé entre comptes (+25) ──────────────────────────────
    if check_shared_device(device_fingerprint, user_id):
        score += S_SHARED_DEVICE
        factors.append({
            "name":    "shared_device",
            "points":  S_SHARED_DEVICE,
            "details": "Cet appareil a été utilisé par un autre compte",
            "icon":    "👥",
        })

    # ── 8. User-Agent suspect (+35) ────────────────────────────────────────
    if check_suspicious_user_agent(user_agent):
        score += S_SUSPICIOUS_UA
        factors.append({
            "name":    "suspicious_ua",
            "points":  S_SUSPICIOUS_UA,
            "details": "User-Agent automatisé ou bot détecté",
            "icon":    "🤖",
        })

    # ── Niveau de risque ───────────────────────────────────────────────────
    if score <= 20:
        level, action = "LOW",      "ALLOW"
    elif score <= 50:
        level, action = "MEDIUM",   "WARN"
    elif score <= 80:
        level, action = "HIGH",     "ALERT"
    else:
        level, action = "CRITICAL", "BLOCK"

    return {"score": score, "level": level, "factors": factors, "action": action}


# ═════════════════════════════════════════════════════════════════════════════
# Critères individuels
# ═════════════════════════════════════════════════════════════════════════════

def check_new_device(user_id: str, device_fingerprint: str) -> bool:
    """True si le device n'a jamais été vu pour cet utilisateur."""
    uid = ObjectId(user_id)
    return _devices_col.find_one({
        "user_id":            uid,
        "device_fingerprint": device_fingerprint,
    }) is None


def check_new_city(user_id: str, location: dict, days: int = 7,
                   exclude_fp: str = None) -> bool:
    """True si la ville n'a pas été vue dans les N derniers jours."""
    city = (location.get("city") or "").strip()
    if not city or city in ("Unknown", "Local", "Réseau privé", ""):
        return False

    uid   = ObjectId(user_id)
    since = datetime.utcnow() - timedelta(days=days)
    query = {
        "user_id":        uid,
        "location.city":  city,
        "last_seen_at":   {"$gte": since},
    }
    if exclude_fp:
        query["device_fingerprint"] = {"$ne": exclude_fp}

    return _devices_col.find_one(query) is None


def check_new_country(user_id: str, location: dict, days: int = 30,
                      exclude_fp: str = None) -> bool:
    """True si le pays n'a pas été vu dans les N derniers jours."""
    country = (location.get("country") or "").strip()
    if not country or country in ("Unknown", "Local", "Réseau privé", ""):
        return False

    uid   = ObjectId(user_id)
    since = datetime.utcnow() - timedelta(days=days)
    query = {
        "user_id":           uid,
        "location.country":  country,
        "last_seen_at":      {"$gte": since},
    }
    if exclude_fp:
        query["device_fingerprint"] = {"$ne": exclude_fp}

    return _devices_col.find_one(query) is None


def check_unusual_hour(user_id: str, hour: int) -> bool:
    """True si connexion entre 2h–6h ET l'user n'a jamais connecté à ces heures."""
    if not (2 <= hour <= 6):
        return False

    uid   = ObjectId(user_id)
    since = datetime.utcnow() - timedelta(days=90)

    for doc in _devices_col.find(
        {"user_id": uid, "first_seen_at": {"$gte": since}},
        {"first_seen_at": 1},
    ):
        ts = doc.get("first_seen_at")
        if isinstance(ts, datetime) and 2 <= ts.hour <= 6:
            return False  # Déjà connecté à cette heure → pas inhabituel

    return True


def check_failed_2fa_attempts(user_id: str, minutes: int = 30) -> int:
    """Somme des tentatives 2FA échouées dans les N dernières minutes."""
    uid   = ObjectId(user_id)
    since = datetime.utcnow() - timedelta(minutes=minutes)
    try:
        result = list(_auth_codes_col.aggregate([
            {"$match": {
                "user_id":    uid,
                "created_at": {"$gte": since},
                "attempts":   {"$gt": 0},
            }},
            {"$group": {"_id": None, "total": {"$sum": "$attempts"}}},
        ]))
        return result[0]["total"] if result else 0
    except Exception:
        return 0


def check_impossible_geo_jump(user_id: str, current_location: dict,
                               timestamp: datetime = None) -> bool:
    """
    True si la dernière connexion était dans un pays différent il y a < 2h.
    Déplacement physiquement impossible → signal de fraude fort.
    """
    current_country = (current_location.get("country") or "").strip()
    if not current_country or current_country in ("Unknown", "Local", "Réseau privé", ""):
        return False

    if timestamp is None:
        timestamp = datetime.utcnow()

    uid           = ObjectId(user_id)
    two_hours_ago = timestamp - timedelta(hours=2)

    last = _devices_col.find_one(
        {
            "user_id":          uid,
            "last_seen_at":     {"$gte": two_hours_ago, "$lt": timestamp},
            "location.country": {"$exists": True, "$ne": ""},
        },
        sort=[("last_seen_at", DESCENDING)],
    )
    if not last:
        return False

    last_country = (last.get("location", {}).get("country") or "").strip()
    if not last_country or last_country in ("Unknown", "Local", "Réseau privé"):
        return False

    return last_country != current_country


def check_shared_device(device_fingerprint: str, current_user_id: str) -> bool:
    """True si le fingerprint est utilisé par un autre compte utilisateur."""
    try:
        uid = ObjectId(current_user_id)
        return _devices_col.find_one({
            "device_fingerprint": device_fingerprint,
            "user_id":            {"$ne": uid},
        }) is not None
    except Exception:
        return False


def check_suspicious_user_agent(user_agent: str) -> bool:
    """True si le User-Agent correspond à un pattern automatisé/bot."""
    ua = (user_agent or "").lower()
    return any(p in ua for p in _SUSPICIOUS_UA_PATTERNS)


# ═════════════════════════════════════════════════════════════════════════════
# Audit log & actions de sécurité
# ═════════════════════════════════════════════════════════════════════════════

def log_security_incident(
    user_id:      str,
    device_id:    str,
    risk:         dict,
    ip:           str,
    action_taken: str,
) -> str:
    """Enregistre un incident de sécurité."""
    doc = {
        "user_id":      ObjectId(user_id),
        "device_id":    device_id,
        "risk_score":   risk["score"],
        "risk_level":   risk["level"],
        "risk_factors": risk["factors"],
        "ip_address":   ip,
        "action_taken": action_taken,
        "created_at":   datetime.utcnow(),
    }
    result = _incidents_col.insert_one(doc)
    return str(result.inserted_id)


def invalidate_all_user_sessions(user_id: str) -> None:
    """
    Déconnexion forcée complète:
    - Bloque tous les devices
    - Supprime tous les trusted_devices
    - Flag force_relogin sur le user document
    - Flag must_reset_password
    """
    try:
        uid = ObjectId(user_id)
        now = datetime.utcnow()

        _devices_col.update_many(
            {"user_id": uid},
            {"$set": {"is_blocked": True, "status": "revoked",
                      "force_revoked_at": now}},
        )
        _db["trusted_devices"].delete_many({"user_id": uid})
        _db["users"].update_one(
            {"_id": uid},
            {"$set": {
                "force_relogin":       True,
                "force_relogin_at":    now,
                "must_reset_password": True,
            }},
        )
        print(f"[RISK] Toutes les sessions de {user_id} invalidées (CRITICAL)")
    except Exception as e:
        print(f"[RISK] Erreur invalidate_all_user_sessions: {e}")


def generate_not_me_token(device_id: str, user_id: str) -> str:
    """
    Génère un token HMAC-SHA256 signé pour le bouton 'Ce n'était pas moi'.
    Format: device_id:user_id:timestamp → signé avec JWT_SECRET_KEY.
    """
    import hmac
    import time
    secret = os.getenv("JWT_SECRET_KEY", "secret").encode()
    ts     = str(int(time.time()))
    msg    = f"{device_id}:{user_id}:{ts}".encode()
    sig    = hmac.new(secret, msg, "sha256").hexdigest()
    import base64
    payload = base64.urlsafe_b64encode(f"{device_id}:{user_id}:{ts}".encode()).decode()
    return f"{payload}.{sig}"


def verify_not_me_token(token: str, max_age_hours: int = 48) -> dict | None:
    """
    Vérifie un token 'Ce n'était pas moi' — usage unique.
    Retourne:
      None                            → signature invalide ou token expiré
      {"error": "TOKEN_ALREADY_USED"} → lien déjà cliqué
      {"device_id": str, "user_id": str} → valide, premier usage (token marqué comme utilisé)
    """
    import hmac
    import time
    import base64
    import hashlib
    try:
        payload_b64, sig = token.rsplit(".", 1)
        payload   = base64.urlsafe_b64decode(payload_b64.encode()).decode()
        device_id, user_id, ts = payload.split(":", 2)

        # Vérifier l'expiration
        if (int(time.time()) - int(ts)) > max_age_hours * 3600:
            return None

        # Vérifier la signature HMAC
        secret   = os.getenv("JWT_SECRET_KEY", "secret").encode()
        expected = hmac.new(secret, payload.encode(), "sha256").hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None

        # Vérifier l'usage unique — empreinte SHA-256 du token brut
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        already_used = _used_not_me_tokens_col.find_one({"token_hash": token_hash})
        if already_used:
            return {"error": "TOKEN_ALREADY_USED"}

        # Marquer le token comme utilisé (TTL 48h → nettoyage automatique)
        _used_not_me_tokens_col.insert_one({
            "token_hash": token_hash,
            "user_id":    user_id,
            "device_id":  device_id,
            "used_at":    datetime.utcnow(),
        })

        return {"device_id": device_id, "user_id": user_id}
    except Exception:
        return None
