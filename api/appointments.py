"""
api/appointments.py
Module de gestion des rendez-vous
"""

import os
from datetime import datetime, timedelta, time
from typing import Optional, List
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING

# ════════════════════════════════════════
# Connexion MongoDB
# ════════════════════════════════════════
_client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db = _client["attijari_chatbot"]
_appointments_col = _db["appointments"]
_availability_col = _db["advisor_availability"]
_users_col = _db["users"]

# Index pour performance
_appointments_col.create_index([("client_id", ASCENDING), ("date", ASCENDING)])
_appointments_col.create_index([("status", ASCENDING), ("date", ASCENDING)])
_appointments_col.create_index([("advisor_id", ASCENDING), ("date", ASCENDING)])

# ════════════════════════════════════════
# Configuration métier
# ════════════════════════════════════════

# Motifs de RDV proposés au client
APPOINTMENT_MOTIFS = [
    {"id": "credit_immobilier",   "label": "Demande de crédit immobilier",  "icon": "🏠"},
    {"id": "credit_auto",         "label": "Demande de crédit auto",        "icon": "🚗"},
    {"id": "credit_consommation", "label": "Crédit à la consommation",      "icon": "💳"},
    {"id": "ouverture_compte",    "label": "Ouverture de compte",           "icon": "📋"},
    {"id": "epargne_placement",   "label": "Conseil épargne et placements", "icon": "💰"},
    {"id": "carte_bancaire",      "label": "Carte bancaire",                "icon": "💳"},
    {"id": "assurance",           "label": "Produits d'assurance",          "icon": "🛡️"},
    {"id": "reclamation",         "label": "Réclamation / Question",        "icon": "💬"},
    {"id": "autre",               "label": "Autre motif",                   "icon": "📝"},
]

# Configuration par défaut des créneaux
DEFAULT_DURATION_MINUTES = 30
DEFAULT_OPENING_HOUR = 9   # 9h00
DEFAULT_CLOSING_HOUR = 17  # 17h00
LUNCH_BREAK_START = 12     # 12h00
LUNCH_BREAK_END = 14       # 14h00
WORKING_DAYS = [0, 1, 2, 3, 4]  # Lun-Ven (0=lundi)


# ════════════════════════════════════════
# Génération des créneaux disponibles
# ════════════════════════════════════════

def generate_slots_for_date(target_date: datetime) -> list[dict]:
    """
    Génère tous les créneaux possibles pour une date donnée.
    Retourne: [{ "start": "09:00", "end": "09:30", "available": True/False }, ...]
    """
    # Vérifier si jour ouvré
    if target_date.weekday() not in WORKING_DAYS:
        return []
    
    # Ne pas proposer de RDV dans le passé
    if target_date.date() < datetime.now().date():
        return []
    
    slots = []
    
    # Matin: 9h-12h
    for hour in range(DEFAULT_OPENING_HOUR, LUNCH_BREAK_START):
        for minute in [0, 30]:
            start_time = f"{hour:02d}:{minute:02d}"
            end_minute = minute + DEFAULT_DURATION_MINUTES
            end_hour = hour + (end_minute // 60)
            end_minute = end_minute % 60
            end_time = f"{end_hour:02d}:{end_minute:02d}"
            slots.append({
                "start": start_time,
                "end": end_time,
                "available": True
            })
    
    # Après-midi: 14h-17h
    for hour in range(LUNCH_BREAK_END, DEFAULT_CLOSING_HOUR):
        for minute in [0, 30]:
            start_time = f"{hour:02d}:{minute:02d}"
            end_minute = minute + DEFAULT_DURATION_MINUTES
            end_hour = hour + (end_minute // 60)
            end_minute = end_minute % 60
            end_time = f"{end_hour:02d}:{end_minute:02d}"
            slots.append({
                "start": start_time,
                "end": end_time,
                "available": True
            })
    
    # Marquer les créneaux déjà pris
    taken_slots = _get_taken_slots_for_date(target_date)
    for slot in slots:
        if slot["start"] in taken_slots:
            slot["available"] = False
    
    # Si c'est aujourd'hui, marquer les créneaux passés comme indisponibles
    if target_date.date() == datetime.now().date():
        current_time = datetime.now().time()
        for slot in slots:
            slot_hour, slot_minute = map(int, slot["start"].split(":"))
            slot_time = time(slot_hour, slot_minute)
            if slot_time <= current_time:
                slot["available"] = False
    
    return slots


def _get_taken_slots_for_date(target_date: datetime) -> set:
    """Récupère les heures de début des créneaux déjà réservés pour une date."""
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    appointments = _appointments_col.find({
        "date": {"$gte": start_of_day, "$lt": end_of_day},
        "status": {"$in": ["pending", "confirmed"]}  # bloquer pending + confirmed
    }, {"start_time": 1})
    
    return {appt["start_time"] for appt in appointments}


def get_availability_for_month(year: int, month: int) -> dict:
    """
    Retourne pour chaque jour du mois le nombre de créneaux libres.
    Utile pour colorer le calendrier mensuel côté frontend.
    """
    from calendar import monthrange
    
    _, last_day = monthrange(year, month)
    result = {}
    
    for day in range(1, last_day + 1):
        target_date = datetime(year, month, day)
        slots = generate_slots_for_date(target_date)
        available_count = sum(1 for s in slots if s["available"])
        total_count = len(slots)
        
        result[f"{year}-{month:02d}-{day:02d}"] = {
            "total_slots": total_count,
            "available_slots": available_count,
            "is_working_day": target_date.weekday() in WORKING_DAYS,
            "is_past": target_date.date() < datetime.now().date(),
        }
    
    return result


# ════════════════════════════════════════
# CRUD Rendez-vous
# ════════════════════════════════════════

def create_appointment(
    client_id: str,
    date_str: str,        # "2026-05-15"
    start_time: str,      # "10:00"
    motif_id: str,
    notes_client: str = "",
) -> dict:
    """
    Crée une demande de RDV (status=pending) après vérification de disponibilité.
    """
    # Validation du motif
    motif = next((m for m in APPOINTMENT_MOTIFS if m["id"] == motif_id), None)
    if not motif:
        return {"error": "Motif invalide"}
    
    # Parsing de la date
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return {"error": "Format de date invalide (attendu: YYYY-MM-DD)"}
    
    # Vérifier que c'est un jour ouvré non passé
    if target_date.weekday() not in WORKING_DAYS:
        return {"error": "Le RDV doit être un jour ouvré (Lundi-Vendredi)"}
    if target_date.date() < datetime.now().date():
        return {"error": "Impossible de réserver un RDV dans le passé"}
    
    # Vérifier que le créneau est libre
    taken = _get_taken_slots_for_date(target_date)
    if start_time in taken:
        return {"error": "Ce créneau n'est plus disponible"}
    
    # Calculer end_time
    hour, minute = map(int, start_time.split(":"))
    end_total_minutes = hour * 60 + minute + DEFAULT_DURATION_MINUTES
    end_hour = end_total_minutes // 60
    end_minute = end_total_minutes % 60
    end_time = f"{end_hour:02d}:{end_minute:02d}"
    
    # Récupérer info du client
    client = _users_col.find_one({"_id": ObjectId(client_id)})
    if not client:
        return {"error": "Client introuvable"}
    
    client_name = f"{client.get('prenom', '')} {client.get('nom', '')}".strip() or client.get("email", "Client")
    
    # Créer le document
    doc = {
        "client_id": ObjectId(client_id),
        "client_name": client_name,
        "client_email": client.get("email"),
        "advisor_id": None,           # sera set lors de la validation
        "advisor_name": None,
        
        "date": target_date,
        "start_time": start_time,
        "end_time": end_time,
        "duration_minutes": DEFAULT_DURATION_MINUTES,
        
        "motif_id": motif["id"],
        "motif_label": motif["label"],
        "motif_icon": motif["icon"],
        "notes_client": notes_client.strip(),
        
        "status": "pending",
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "alternative_proposed": None,
        
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = _appointments_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return _format_appointment(doc)


def list_client_appointments(client_id: str, status_filter: Optional[str] = None) -> list[dict]:
    """Liste les RDV d'un client avec filtre optionnel par statut."""
    query = {"client_id": ObjectId(client_id)}
    if status_filter:
        query["status"] = status_filter
    
    cursor = _appointments_col.find(query).sort([("date", DESCENDING), ("start_time", DESCENDING)])
    return [_format_appointment(doc) for doc in cursor]


def list_pending_appointments() -> list[dict]:
    """Liste toutes les demandes en attente (vue admin)."""
    cursor = _appointments_col.find({"status": "pending"}).sort([("date", ASCENDING), ("start_time", ASCENDING)])
    return [_format_appointment(doc) for doc in cursor]


def list_all_appointments_for_calendar(start_date: datetime, end_date: datetime) -> list[dict]:
    """Liste tous les RDV (toutes statuts) pour vue calendrier admin."""
    cursor = _appointments_col.find({
        "date": {"$gte": start_date, "$lt": end_date},
        "status": {"$in": ["pending", "confirmed"]}
    }).sort([("date", ASCENDING), ("start_time", ASCENDING)])
    return [_format_appointment(doc) for doc in cursor]


def get_appointment(appointment_id: str) -> Optional[dict]:
    """Récupère un RDV par son ID."""
    doc = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    return _format_appointment(doc) if doc else None


def approve_appointment(appointment_id: str, advisor_id: str, advisor_name: str) -> dict:
    """Validation d'un RDV par un conseiller."""
    appointment = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return {"error": "RDV introuvable"}
    if appointment["status"] != "pending":
        return {"error": f"RDV déjà traité (statut: {appointment['status']})"}
    
    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "confirmed",
            "advisor_id": ObjectId(advisor_id),
            "advisor_name": advisor_name,
            "reviewed_by": ObjectId(advisor_id),
            "reviewed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }}
    )
    return get_appointment(appointment_id)


def reject_appointment(appointment_id: str, advisor_id: str, advisor_name: str, reason: str) -> dict:
    """Refus d'un RDV par un conseiller avec motif."""
    appointment = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return {"error": "RDV introuvable"}
    if appointment["status"] != "pending":
        return {"error": f"RDV déjà traité (statut: {appointment['status']})"}
    
    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "rejected",
            "advisor_id": ObjectId(advisor_id),
            "advisor_name": advisor_name,
            "reviewed_by": ObjectId(advisor_id),
            "reviewed_at": datetime.utcnow(),
            "rejection_reason": reason.strip(),
            "updated_at": datetime.utcnow(),
        }}
    )
    return get_appointment(appointment_id)


def propose_alternative(
    appointment_id: str,
    advisor_id: str,
    advisor_name: str,
    new_date_str: str,
    new_start_time: str,
    message: str = ""
) -> dict:
    """Propose un autre créneau au client."""
    try:
        new_date = datetime.strptime(new_date_str, "%Y-%m-%d")
    except ValueError:
        return {"error": "Format de date invalide"}
    
    # Calcul end_time
    hour, minute = map(int, new_start_time.split(":"))
    end_total_minutes = hour * 60 + minute + DEFAULT_DURATION_MINUTES
    end_hour = end_total_minutes // 60
    end_minute = end_total_minutes % 60
    new_end_time = f"{end_hour:02d}:{end_minute:02d}"
    
    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "alternative_proposed",
            "advisor_id": ObjectId(advisor_id),
            "advisor_name": advisor_name,
            "reviewed_by": ObjectId(advisor_id),
            "reviewed_at": datetime.utcnow(),
            "alternative_proposed": {
                "date": new_date,
                "start_time": new_start_time,
                "end_time": new_end_time,
                "message": message.strip()
            },
            "updated_at": datetime.utcnow(),
        }}
    )
    return get_appointment(appointment_id)


def propose_multiple_alternatives(
    appointment_id: str,
    advisor_id: str,
    advisor_name: str,
    slots: list,
    message: str = "",
) -> dict:
    """Propose 2 à 3 créneaux alternatifs au client pour reprogrammer un RDV confirmé."""
    appointment = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return {"error": "RDV introuvable"}
    if appointment["status"] != "confirmed":
        return {"error": f"Seuls les RDV confirmés peuvent être reprogrammés (statut actuel: {appointment['status']})"}
    if not (2 <= len(slots) <= 3):
        return {"error": "Proposez entre 2 et 3 créneaux"}

    formatted = []
    for s in slots:
        try:
            date_obj = datetime.strptime(s["date"], "%Y-%m-%d")
        except (ValueError, KeyError):
            return {"error": f"Format de date invalide : {s.get('date')}"}
        h, m = map(int, s["start_time"].split(":"))
        end_total = h * 60 + m + DEFAULT_DURATION_MINUTES
        formatted.append({
            "date":       date_obj,
            "date_str":   s["date"],
            "start_time": s["start_time"],
            "end_time":   f"{end_total // 60:02d}:{end_total % 60:02d}",
        })

    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status":               "alternative_proposed",
            "advisor_id":           ObjectId(advisor_id),
            "advisor_name":         advisor_name,
            "reviewed_by":          ObjectId(advisor_id),
            "reviewed_at":          datetime.utcnow(),
            "alternatives_multiple": formatted,
            "alternatives_message": message.strip(),
            "alternative_proposed": None,
            "updated_at":           datetime.utcnow(),
        }}
    )
    return get_appointment(appointment_id)


def choose_alternative_slot(appointment_id: str, client_id: str, slot_index: int) -> dict:
    """Le client choisit l'un des créneaux proposés → RDV reconfirmé."""
    appointment = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return {"error": "RDV introuvable"}
    if str(appointment["client_id"]) != client_id:
        return {"error": "Non autorisé"}
    if appointment["status"] != "alternative_proposed":
        return {"error": "Aucune alternative en attente"}

    slots = appointment.get("alternatives_multiple") or []
    if not slots:
        return {"error": "Aucun créneau multiple disponible — utilisez accept-alternative"}
    if not (0 <= slot_index < len(slots)):
        return {"error": "Index de créneau invalide"}

    chosen = slots[slot_index]
    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status":                "confirmed",
            "date":                  chosen["date"],
            "start_time":            chosen["start_time"],
            "end_time":              chosen["end_time"],
            "alternatives_multiple": None,
            "alternatives_message":  None,
            "updated_at":            datetime.utcnow(),
        }}
    )
    return get_appointment(appointment_id)


def advisor_cancel_appointment(appointment_id: str, advisor_id: str, advisor_name: str, reason: str) -> dict:
    """
    Annulation d'un RDV confirmé par le conseiller (réunion urgente, imprévu).
    Le créneau redevient disponible et le client reçoit une notification.
    """
    appointment = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return {"error": "RDV introuvable"}
    if appointment["status"] != "confirmed":
        return {"error": f"Seuls les RDV confirmés peuvent être annulés par le conseiller (statut actuel: {appointment['status']})"}

    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "cancelled_by_advisor",
            "cancellation_reason": reason.strip(),
            "cancelled_by": ObjectId(advisor_id),
            "cancelled_by_name": advisor_name,
            "cancelled_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }}
    )
    return get_appointment(appointment_id)


def cancel_appointment(appointment_id: str, client_id: str) -> dict:
    """Annulation d'un RDV par le client (uniquement avant confirmation, ou >24h avant)."""
    appointment = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return {"error": "RDV introuvable"}
    
    # Vérifier que c'est bien le client propriétaire
    if str(appointment["client_id"]) != client_id:
        return {"error": "Vous n'êtes pas autorisé à annuler ce RDV"}
    
    # Vérifier le délai (impossible si <24h avant un RDV confirmé)
    if appointment["status"] == "confirmed":
        time_until = appointment["date"] - datetime.now()
        if time_until < timedelta(hours=24):
            return {"error": "Impossible d'annuler moins de 24h avant le RDV. Contactez votre conseiller."}
    
    if appointment["status"] in ["rejected", "cancelled", "completed"]:
        return {"error": f"RDV déjà clos (statut: {appointment['status']})"}
    
    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.utcnow(),
        }}
    )
    return {"ok": True, "message": "RDV annulé"}


def accept_alternative(appointment_id: str, client_id: str) -> dict:
    """Le client accepte le créneau alternatif proposé par l'admin."""
    appointment = _appointments_col.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        return {"error": "RDV introuvable"}
    if str(appointment["client_id"]) != client_id:
        return {"error": "Non autorisé"}
    if appointment["status"] != "alternative_proposed":
        return {"error": "Aucune alternative proposée"}
    
    alt = appointment["alternative_proposed"]
    _appointments_col.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "confirmed",
            "date": alt["date"],
            "start_time": alt["start_time"],
            "end_time": alt["end_time"],
            "alternative_proposed": None,
            "updated_at": datetime.utcnow(),
        }}
    )
    return get_appointment(appointment_id)


# ════════════════════════════════════════
# Statistiques admin
# ════════════════════════════════════════

def get_appointments_stats() -> dict:
    """Statistiques pour le dashboard admin."""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)
    
    return {
        "pending": _appointments_col.count_documents({"status": "pending"}),
        "confirmed_today": _appointments_col.count_documents({
            "status": "confirmed",
            "date": {"$gte": today_start, "$lt": today_end}
        }),
        "confirmed_this_week": _appointments_col.count_documents({
            "status": "confirmed",
            "date": {"$gte": today_start, "$lt": week_end}
        }),
        "total_this_month": _appointments_col.count_documents({
            "date": {"$gte": today_start.replace(day=1), "$lt": week_end + timedelta(days=23)}
        }),
    }


# ════════════════════════════════════════
# Formatage pour le frontend
# ════════════════════════════════════════

def _format_appointment(doc: dict) -> dict:
    """Convertit un document MongoDB en dict JSON-friendly."""
    if not doc:
        return None
    
    formatted = {
        "id": str(doc["_id"]),
        "client_id": str(doc["client_id"]),
        "client_name": doc.get("client_name"),
        "client_email": doc.get("client_email"),
        "advisor_id": str(doc["advisor_id"]) if doc.get("advisor_id") else None,
        "advisor_name": doc.get("advisor_name"),
        
        "date": doc["date"].strftime("%Y-%m-%d") if doc.get("date") else None,
        "start_time": doc.get("start_time"),
        "end_time": doc.get("end_time"),
        "duration_minutes": doc.get("duration_minutes"),
        
        "motif_id": doc.get("motif_id"),
        "motif_label": doc.get("motif_label"),
        "motif_icon": doc.get("motif_icon"),
        "notes_client": doc.get("notes_client", ""),
        
        "status": doc.get("status"),
        "rejection_reason": doc.get("rejection_reason"),
        "alternative_proposed": _format_alternative(doc.get("alternative_proposed")),
        "alternatives_multiple": _format_alternatives_multiple(doc.get("alternatives_multiple")),
        "alternatives_message": doc.get("alternatives_message", ""),
        "cancellation_reason": doc.get("cancellation_reason"),
        "cancelled_by_name": doc.get("cancelled_by_name"),
        
        "reviewed_by": str(doc["reviewed_by"]) if doc.get("reviewed_by") else None,
        "reviewed_at": doc["reviewed_at"].isoformat() if doc.get("reviewed_at") else None,
        
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "updated_at": doc["updated_at"].isoformat() if doc.get("updated_at") else None,
    }
    return formatted


def _format_alternative(alt: Optional[dict]) -> Optional[dict]:
    if not alt:
        return None
    return {
        "date": alt["date"].strftime("%Y-%m-%d") if alt.get("date") else None,
        "start_time": alt.get("start_time"),
        "end_time": alt.get("end_time"),
        "message": alt.get("message", ""),
    }


def _format_alternatives_multiple(slots) -> Optional[list]:
    if not slots:
        return None
    result = []
    for s in slots:
        date_obj = s.get("date")
        result.append({
            "date_str": date_obj.strftime("%Y-%m-%d") if hasattr(date_obj, "strftime") else str(date_obj or "")[:10],
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
        })
    return result