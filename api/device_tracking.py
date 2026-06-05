# api/device_tracking.py
"""
Phase C — Détection de connexion suspecte.
Gère l'audit des devices utilisateur: enregistrement, détection
de nouveaux appareils, révocation admin.

Collection MongoDB: "user_devices"
Indépendant de trusted_devices (Phase B).
"""

import hashlib
import os
import socket
import requests as _requests
from datetime import datetime, timedelta
from bson import ObjectId
from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv
from .risk_scoring import calculate_login_risk

load_dotenv(override=True)

_client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db     = _client["attijari_chatbot"]
_col    = _db["user_devices"]

# ── Index ─────────────────────────────────────────────────────────────────────
_col.create_index(
    [("user_id", 1), ("device_fingerprint", 1)],
    unique=True,
    name="uq_user_device_fp",
)
_col.create_index("last_seen_at", name="idx_last_seen")
_col.create_index("status",       name="idx_status")
_col.create_index("user_id",      name="idx_user_id")


# ── IP / UA helpers ──────────────────────────────────────────────────────────

def _ip_subnet(ip: str) -> str:
    """Retourne les 3 premiers octets (ex: '192.168.1') pour tolérance NAT."""
    parts = ip.split(".")
    return ".".join(parts[:3]) if len(parts) >= 3 else ip


def compute_device_fingerprint(ip: str, user_agent: str) -> str:
    """
    SHA-256 de (IP_subnet + UA simplifié).
    Tolérant aux IP dynamiques d'un même réseau et aux mises-à-jour
    mineures de browser/OS.
    """
    try:
        from user_agents import parse as _parse_ua
        ua   = _parse_ua(user_agent or "")
        simplified = f"{ua.browser.family}_{ua.os.family}_{ua.device.family}"
    except Exception:
        simplified = (user_agent or "unknown")[:120]

    raw = f"{_ip_subnet(ip)}:{simplified}"
    return hashlib.sha256(raw.encode()).hexdigest()


def parse_user_agent(ua_string: str) -> dict:
    """Parse le User-Agent en infos lisibles."""
    try:
        from user_agents import parse as _parse_ua
        ua = _parse_ua(ua_string or "")
        return {
            "browser":          ua.browser.family or "Unknown",
            "browser_version":  ua.browser.version_string or "",
            "os":               ua.os.family or "Unknown",
            "os_version":       ua.os.version_string or "",
            "device_type":      (
                "Mobile"  if ua.is_mobile else
                "Tablet"  if ua.is_tablet else
                "Desktop"
            ),
            "is_bot": ua.is_bot,
        }
    except Exception:
        return {
            "browser": "Unknown", "browser_version": "",
            "os": "Unknown",      "os_version": "",
            "device_type": "Desktop", "is_bot": False,
        }


def get_ip_location(ip: str) -> dict:
    """
    Géolocalise une IP via ip-api.com (gratuit, sans clé, 45 req/min).
    Fallback silencieux si timeout ou IP privée.
    """
    _fallback = {"country": "Unknown", "city": "Unknown", "timezone": ""}

    if not ip or ip in ("127.0.0.1", "localhost", "::1"):
        return {"country": "Local", "city": "Local", "timezone": ""}

    # IP privée → pas de géoloc
    try:
        packed = socket.inet_aton(ip)
        first  = packed[0]
        second = packed[1]
        if first == 10 or (first == 172 and 16 <= second <= 31) or (first == 192 and second == 168):
            return {"country": "Réseau privé", "city": "", "timezone": ""}
    except Exception:
        pass

    try:
        r = _requests.get(
            f"http://ip-api.com/json/{ip}?fields=status,country,city,timezone",
            timeout=3,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "success":
                return {
                    "country":  data.get("country", ""),
                    "city":     data.get("city", ""),
                    "timezone": data.get("timezone", ""),
                }
    except Exception:
        pass

    return _fallback


# ── Fonctions principales ─────────────────────────────────────────────────────

def register_device(user_id: str, ip: str, user_agent: str) -> dict:
    """
    Enregistre une connexion, calcule le score de risque RBA.
    Retourne {"device": {...}, "is_new_device": bool, "risk": {...}}.
    """
    fp  = compute_device_fingerprint(ip, user_agent)
    now = datetime.utcnow()
    uid = ObjectId(user_id)

    existing     = _col.find_one({"user_id": uid, "device_fingerprint": fp})
    is_new       = existing is None

    if existing:
        location = existing.get("location") or get_ip_location(ip)
    else:
        location = get_ip_location(ip)

    # ── Calcul du risque (avant mise à jour pour geo-jump correct) ─────────
    risk = calculate_login_risk(
        user_id            = user_id,
        device_fingerprint = fp,
        is_new_device      = is_new,
        location           = location,
        ip                 = ip,
        user_agent         = user_agent,
        timestamp          = now,
    )
    is_suspicious = risk["level"] in ("HIGH", "CRITICAL")

    if existing:
        _col.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "last_seen_at":  now,
                    "ip_address":    ip,
                    "location":      location,
                    "risk_score":    risk["score"],
                    "risk_level":    risk["level"],
                    "risk_factors":  risk["factors"],
                    "is_suspicious": is_suspicious,
                    "status":        "suspicious" if is_suspicious else existing.get("status", "active"),
                },
                "$inc": {"login_count": 1},
            },
        )
        existing.update({
            "last_seen_at":  now,
            "login_count":   existing.get("login_count", 0) + 1,
            "risk_score":    risk["score"],
            "risk_level":    risk["level"],
            "risk_factors":  risk["factors"],
            "is_suspicious": is_suspicious,
        })
        return {"device": _serialize(existing), "is_new_device": False, "risk": risk}

    # Nouveau device
    device_info = parse_user_agent(user_agent)

    doc = {
        "user_id":            uid,
        "device_fingerprint": fp,
        "ip_address":         ip,
        "ip_subnet":          _ip_subnet(ip),
        "user_agent_raw":     (user_agent or "")[:512],
        "device_info":        device_info,
        "location":           location,
        "first_seen_at":      now,
        "last_seen_at":       now,
        "login_count":        1,
        "is_alerted":         False,
        "is_blocked":         False,
        "status":             "suspicious" if is_suspicious else "active",
        "risk_score":         risk["score"],
        "risk_level":         risk["level"],
        "risk_factors":       risk["factors"],
        "is_suspicious":      is_suspicious,
        "reported_not_me":    False,
    }

    result = _col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"device": _serialize(doc), "is_new_device": True, "risk": risk}


def mark_device_as_alerted(device_id) -> None:
    """Marque le device comme 'email alerte envoyé'."""
    try:
        _col.update_one(
            {"_id": ObjectId(str(device_id))},
            {"$set": {"is_alerted": True}},
        )
    except Exception:
        pass


def list_user_devices(user_id: str, limit: int = 50) -> list:
    """Tous les devices d'un utilisateur, triés par dernière activité."""
    docs = _col.find(
        {"user_id": ObjectId(user_id)},
        limit=limit,
        sort=[("last_seen_at", DESCENDING)],
    )
    return [_serialize(d) for d in docs]


def list_all_active_sessions(days: int = 7, status_filter: str = "all",
                              user_email: str = "") -> list:
    """
    Pour admin: toutes les sessions récentes avec infos user.
    Fait un lookup MongoDB users pour enrichir chaque session.
    """
    since = datetime.utcnow() - timedelta(days=days)
    query: dict = {"last_seen_at": {"$gte": since}}

    if status_filter != "all":
        query["status"] = status_filter

    pipeline = [
        {"$match": query},
        {"$sort": {"last_seen_at": -1}},
        {"$lookup": {
            "from":         "users",
            "localField":   "user_id",
            "foreignField": "_id",
            "as":           "user",
        }},
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {"$limit": 500},
    ]

    if user_email:
        # Filtre APRÈS le $lookup pour pouvoir accéder à "user.email"
        pipeline.insert(4, {"$match": {"user.email": {"$regex": user_email, "$options": "i"}}})

    rows = []
    for doc in _db.user_devices.aggregate(pipeline):
        u = doc.get("user") or {}
        row = _serialize(doc)
        row["user_email"]  = u.get("email", "—")
        row["user_nom"]    = u.get("nom", "")
        row["user_prenom"] = u.get("prenom", "")
        rows.append(row)

    return rows


def get_sessions_stats(days: int = 7) -> dict:
    """Statistiques globales pour l'admin."""
    since    = datetime.utcnow() - timedelta(days=days)
    today    = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    last_24h = datetime.utcnow() - timedelta(hours=24)

    total_active     = _col.count_documents({"last_seen_at": {"$gte": since}, "status": "active"})
    total_suspicious = _col.count_documents({"status": "suspicious"})
    total_blocked    = _col.count_documents({"is_blocked": True})
    new_today        = _col.count_documents({"first_seen_at": {"$gte": today}})

    # Utilisateurs uniques aujourd'hui
    users_today = len(_col.distinct("user_id", {"last_seen_at": {"$gte": today}}))

    # Pays uniques (7 jours)
    countries = _col.distinct("location.country", {"last_seen_at": {"$gte": since}})
    unique_countries = len([c for c in countries if c and c not in ("Unknown", "Local", "Réseau privé", "")])

    # Alertes RBA (24h)
    high_risk_24h    = _col.count_documents({"last_seen_at": {"$gte": last_24h}, "risk_level": "HIGH"})
    critical_24h     = _col.count_documents({"last_seen_at": {"$gte": last_24h}, "risk_level": "CRITICAL"})
    not_me_pending   = _col.count_documents({"reported_not_me": True, "status": {"$ne": "revoked"}})

    return {
        "total_active":       total_active,
        "total_suspicious":   total_suspicious,
        "total_blocked":      total_blocked,
        "new_devices_today":  new_today,
        "unique_users_today": users_today,
        "unique_countries":   unique_countries,
        "high_risk_24h":      high_risk_24h,
        "critical_24h":       critical_24h,
        "not_me_pending":     not_me_pending,
    }


def revoke_device(device_id: str, admin_id: str) -> dict:
    """Admin révoque un device: status=revoked, is_blocked=True."""
    try:
        result = _col.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {
                "status":      "revoked",
                "is_blocked":  True,
                "revoked_at":  datetime.utcnow(),
                "revoked_by":  ObjectId(admin_id),
            }},
        )
        if result.matched_count == 0:
            return {"error": "Device introuvable"}
        doc = _col.find_one({"_id": ObjectId(device_id)})
        return {"success": True, "device": _serialize(doc)}
    except Exception as e:
        return {"error": str(e)}


def mark_device_suspicious(device_id: str, reason: str = "") -> dict:
    """Marque un device comme suspect."""
    try:
        _col.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {
                "status":           "suspicious",
                "suspicious_reason": reason,
                "flagged_at":        datetime.utcnow(),
            }},
        )
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}


def mark_device_legitimate(device_id: str) -> dict:
    """Marque un device comme légitime (remet statut à active, risk LOW)."""
    try:
        _col.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {
                "status":        "active",
                "is_suspicious": False,
                "risk_level":    "LOW",
                "risk_score":    0,
                "risk_factors":  [],
            }},
        )
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}


def mark_device_not_me(device_id: str) -> dict:
    """Marque un device comme signalé par l'utilisateur ('Ce n'était pas moi')."""
    try:
        _col.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {
                "reported_not_me":    True,
                "reported_not_me_at": datetime.utcnow(),
                "status":             "suspicious",
            }},
        )
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}


def get_device_by_id(device_id: str) -> dict | None:
    """Récupère un device par son ID."""
    try:
        doc = _col.find_one({"_id": ObjectId(device_id)})
        return _serialize(doc) if doc else None
    except Exception:
        return None


# ── Sérialisation ─────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    if not doc:
        return {}
    rnat = doc.get("reported_not_me_at")
    return {
        "id":                   str(doc["_id"]),
        "user_id":              str(doc.get("user_id", "")),
        "device_fingerprint":   doc.get("device_fingerprint", ""),
        "ip_address":           doc.get("ip_address", ""),
        "ip_subnet":            doc.get("ip_subnet", ""),
        "device_info":          doc.get("device_info", {}),
        "location":             doc.get("location", {}),
        "first_seen_at":        doc.get("first_seen_at", "").isoformat() if isinstance(doc.get("first_seen_at"), datetime) else str(doc.get("first_seen_at", "")),
        "last_seen_at":         doc.get("last_seen_at", "").isoformat() if isinstance(doc.get("last_seen_at"), datetime) else str(doc.get("last_seen_at", "")),
        "login_count":          doc.get("login_count", 1),
        "is_alerted":           doc.get("is_alerted", False),
        "is_blocked":           doc.get("is_blocked", False),
        "status":               doc.get("status", "active"),
        # Champs RBA
        "risk_score":           doc.get("risk_score", 0),
        "risk_level":           doc.get("risk_level", "LOW"),
        "risk_factors":         doc.get("risk_factors", []),
        "is_suspicious":        doc.get("is_suspicious", False),
        "reported_not_me":      doc.get("reported_not_me", False),
        "reported_not_me_at":   rnat.isoformat() if isinstance(rnat, datetime) else None,
        # Champs enrichis (lookup admin)
        "user_email":           doc.get("user_email", ""),
        "user_nom":             doc.get("user_nom", ""),
        "user_prenom":          doc.get("user_prenom", ""),
    }
