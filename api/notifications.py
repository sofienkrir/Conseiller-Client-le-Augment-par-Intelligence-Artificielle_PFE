"""
api/notifications.py
Module de gestion des notifications utilisateur (cloche)
"""

import os
from datetime import datetime
from typing import Optional
from bson import ObjectId
from pymongo import MongoClient, DESCENDING

# ════════════════════════════════════════
# Connexion MongoDB
# ════════════════════════════════════════
_client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db = _client["attijari_chatbot"]
_notifications_col = _db["notifications"]
_notifications_col.create_index([("user_id", 1), ("created_at", DESCENDING)])
_notifications_col.create_index([("user_id", 1), ("read", 1)])


# ════════════════════════════════════════
# Types de notifications
# ════════════════════════════════════════

NOTIF_TYPES = {
    "appointment_request":         {"icon": "📅", "color": "blue"},
    "appointment_confirmed":       {"icon": "✅", "color": "green"},
    "appointment_rejected":        {"icon": "❌", "color": "red"},
    "appointment_alternative":     {"icon": "🔄", "color": "orange"},
    "appointment_cancelled":       {"icon": "🚫", "color": "gray"},
    "shared_pdf":                  {"icon": "📄", "color": "purple"},
    "system":                      {"icon": "ℹ️", "color": "blue"},
}


# ════════════════════════════════════════
# Création de notifications
# ════════════════════════════════════════

def create_notification(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    related_id: Optional[str] = None,
    action_url: Optional[str] = None,
) -> dict:
    """
    Crée une notification pour un utilisateur.
    
    Args:
        user_id: ID de l'utilisateur destinataire
        notif_type: type de notif (clé de NOTIF_TYPES)
        title: titre court
        message: corps du message
        related_id: ID de l'objet lié (RDV, PDF, etc.)
        action_url: URL frontend pour le clic
    """
    type_info = NOTIF_TYPES.get(notif_type, NOTIF_TYPES["system"])
    
    doc = {
        "user_id": ObjectId(user_id),
        "type": notif_type,
        "icon": type_info["icon"],
        "color": type_info["color"],
        "title": title,
        "message": message,
        "related_id": related_id,
        "action_url": action_url,
        "read": False,
        "created_at": datetime.utcnow(),
    }
    
    result = _notifications_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _format_notification(doc)


def notify_appointment_created(client_id: str, advisor_ids: list, appointment: dict):
    """
    Crée 2 types de notifs:
      - 1 pour le client (confirmation de soumission)
      - N pour les admins (nouvelle demande)
    """
    # Notif client
    create_notification(
        user_id=client_id,
        notif_type="appointment_request",
        title="Demande de RDV envoyée",
        message=f"Votre demande de RDV pour le {appointment['date']} à {appointment['start_time']} est en attente de validation.",
        related_id=appointment["id"],
        action_url=f"/my-appointments",
    )
    
    # Notif admins
    for admin_id in advisor_ids:
        create_notification(
            user_id=admin_id,
            notif_type="appointment_request",
            title="Nouvelle demande de RDV",
            message=f"{appointment['client_name']} demande un RDV le {appointment['date']} à {appointment['start_time']} ({appointment['motif_label']}).",
            related_id=appointment["id"],
            action_url=f"/admin/appointments",
        )


def notify_appointment_confirmed(client_id: str, appointment: dict):
    create_notification(
        user_id=client_id,
        notif_type="appointment_confirmed",
        title="✅ RDV confirmé",
        message=f"Votre RDV du {appointment['date']} à {appointment['start_time']} avec {appointment['advisor_name']} est confirmé.",
        related_id=appointment["id"],
        action_url=f"/my-appointments",
    )


def notify_appointment_rejected(client_id: str, appointment: dict):
    reason = appointment.get("rejection_reason", "")
    msg = f"Votre RDV du {appointment['date']} à {appointment['start_time']} a été refusé."
    if reason:
        msg += f" Motif: {reason}"
    create_notification(
        user_id=client_id,
        notif_type="appointment_rejected",
        title="RDV refusé",
        message=msg,
        related_id=appointment["id"],
        action_url=f"/my-appointments",
    )


def notify_appointment_multiple_alternatives(client_id: str, appointment: dict):
    slots = appointment.get("alternatives_multiple") or []
    count = len(slots)
    msg = appointment.get("alternatives_message", "")
    text = f"Votre conseiller vous propose {count} créneaux pour reprogrammer votre rendez-vous. Connectez-vous pour choisir le vôtre."
    if msg:
        text += f" Message : {msg}"
    create_notification(
        user_id=client_id,
        notif_type="appointment_alternative",
        title=f"🔄 {count} créneaux proposés pour votre RDV",
        message=text,
        related_id=appointment["id"],
        action_url="/my-appointments",
    )


def notify_appointment_cancelled_by_advisor(client_id: str, appointment: dict):
    reason = appointment.get("cancellation_reason", "")
    msg = f"Votre RDV du {appointment['date']} à {appointment['start_time']} a été annulé par votre conseiller suite à un imprévu."
    if reason:
        msg += f" Motif: {reason}."
    msg += " Vous pouvez soumettre une nouvelle demande de RDV."
    create_notification(
        user_id=client_id,
        notif_type="appointment_cancelled",
        title="⚠️ RDV annulé par le conseiller",
        message=msg,
        related_id=appointment["id"],
        action_url="/my-appointments",
    )


def notify_appointment_alternative(client_id: str, appointment: dict):
    alt = appointment.get("alternative_proposed", {})
    msg = f"Votre conseiller propose un nouveau créneau: {alt.get('date')} à {alt.get('start_time')}."
    if alt.get("message"):
        msg += f" Message: {alt['message']}"
    create_notification(
        user_id=client_id,
        notif_type="appointment_alternative",
        title="🔄 Nouveau créneau proposé",
        message=msg,
        related_id=appointment["id"],
        action_url=f"/my-appointments",
    )


# ════════════════════════════════════════
# Lecture des notifications
# ════════════════════════════════════════

def list_notifications(user_id: str, limit: int = 20, only_unread: bool = False) -> list[dict]:
    """Liste les notifications d'un utilisateur."""
    query = {"user_id": ObjectId(user_id)}
    if only_unread:
        query["read"] = False
    
    cursor = _notifications_col.find(query).sort("created_at", DESCENDING).limit(limit)
    return [_format_notification(doc) for doc in cursor]


def count_unread(user_id: str) -> int:
    """Compte les notifications non lues d'un utilisateur."""
    return _notifications_col.count_documents({
        "user_id": ObjectId(user_id),
        "read": False
    })


def mark_as_read(notification_id: str, user_id: str) -> bool:
    """Marque une notification comme lue."""
    result = _notifications_col.update_one(
        {"_id": ObjectId(notification_id), "user_id": ObjectId(user_id)},
        {"$set": {"read": True}}
    )
    return result.modified_count > 0


def mark_all_as_read(user_id: str) -> int:
    """Marque toutes les notifications d'un user comme lues."""
    result = _notifications_col.update_many(
        {"user_id": ObjectId(user_id), "read": False},
        {"$set": {"read": True}}
    )
    return result.modified_count


def delete_notification(notification_id: str, user_id: str) -> bool:
    """Supprime une notification."""
    result = _notifications_col.delete_one(
        {"_id": ObjectId(notification_id), "user_id": ObjectId(user_id)}
    )
    return result.deleted_count > 0


# ════════════════════════════════════════
# Helpers
# ════════════════════════════════════════

def _format_notification(doc: dict) -> dict:
    """Convertit un document MongoDB en dict JSON-friendly."""
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "type": doc.get("type"),
        "icon": doc.get("icon"),
        "color": doc.get("color"),
        "title": doc.get("title"),
        "message": doc.get("message"),
        "related_id": doc.get("related_id"),
        "action_url": doc.get("action_url"),
        "read": doc.get("read", False),
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
    }


def get_all_admin_ids() -> list[str]:
    """Helper: récupère les IDs de tous les admins (pour broadcast)."""
    users_col = _db["users"]
    cursor = users_col.find({"is_admin": True}, {"_id": 1})
    return [str(u["_id"]) for u in cursor]