"""
api/appointment_routes.py
Endpoints REST pour la gestion des rendez-vous et notifications.

Pour intégrer dans ton projet:
1. Place ce fichier dans api/
2. Dans api/app.py, ajoute:
     from api.appointment_routes import router as appointment_router
     app.include_router(appointment_router, prefix="/api")
"""

import threading
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from .email_service import (
    send_appointment_confirmed,
    send_appointment_rejected,
    send_appointment_cancelled_by_advisor as send_appt_cancelled_email,
    send_appointment_multiple_alternatives as send_appt_multi_email,
)

from .appointments import (
    APPOINTMENT_MOTIFS,
    generate_slots_for_date,
    get_availability_for_month,
    create_appointment,
    list_client_appointments,
    list_pending_appointments,
    list_all_appointments_for_calendar,
    get_appointment,
    approve_appointment,
    reject_appointment,
    propose_alternative,
    cancel_appointment,
    accept_alternative,
    get_appointments_stats,
    advisor_cancel_appointment,
    propose_multiple_alternatives,
    choose_alternative_slot,
)
from .notifications import (
    list_notifications,
    count_unread,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
    notify_appointment_created,
    notify_appointment_confirmed,
    notify_appointment_rejected,
    notify_appointment_alternative,
    notify_appointment_cancelled_by_advisor,
    notify_appointment_multiple_alternatives,
    get_all_admin_ids,
)
from .auth_routes import get_current_user_dependency, get_current_admin_dependency
from .auth_db import AuthDB


router = APIRouter()


# ════════════════════════════════════════
# Pydantic models (validation des requêtes)
# ════════════════════════════════════════

class CreateAppointmentRequest(BaseModel):
    date: str = Field(..., description="Format YYYY-MM-DD")
    start_time: str = Field(..., description="Format HH:MM")
    motif_id: str
    notes_client: Optional[str] = ""


class RejectAppointmentRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class ProposeAlternativeRequest(BaseModel):
    new_date: str
    new_start_time: str
    message: Optional[str] = ""


class AdvisorCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class SlotItem(BaseModel):
    date: str
    start_time: str

class ProposeMultipleRequest(BaseModel):
    slots: List[SlotItem]
    message: Optional[str] = ""

class ChooseSlotRequest(BaseModel):
    slot_index: int = Field(..., ge=0, le=2)


# ════════════════════════════════════════
# Public routes — Configuration
# ════════════════════════════════════════

@router.get("/appointments/motifs")
async def get_motifs():
    """Liste des motifs proposés au client (pour dropdown)."""
    return {"motifs": APPOINTMENT_MOTIFS}


# ════════════════════════════════════════
# Routes CLIENT
# ════════════════════════════════════════

@router.get("/appointments/availability/month")
async def get_month_availability(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Disponibilités pour un mois entier (vue calendrier)."""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Mois invalide (1-12)")
    if year < 2025 or year > 2030:
        raise HTTPException(status_code=400, detail="Année invalide")
    
    return {"availability": get_availability_for_month(year, month)}


@router.get("/appointments/availability/day")
async def get_day_availability(
    date: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Créneaux disponibles pour une date donnée."""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Format YYYY-MM-DD attendu")
    
    slots = generate_slots_for_date(target_date)
    return {"date": date, "slots": slots}


@router.post("/appointments/request")
async def request_appointment(
    req: CreateAppointmentRequest,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Le client soumet une demande de RDV."""
    result = create_appointment(
        client_id=current_user["id"],
        date_str=req.date,
        start_time=req.start_time,
        motif_id=req.motif_id,
        notes_client=req.notes_client or "",
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Notifications: client + tous les admins
    admin_ids = get_all_admin_ids()
    notify_appointment_created(
        client_id=current_user["id"],
        advisor_ids=admin_ids,
        appointment=result,
    )
    
    return result


@router.get("/appointments/my")
async def get_my_appointments(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Liste les RDV du client connecté."""
    appointments = list_client_appointments(
        client_id=current_user["id"],
        status_filter=status,
    )
    return {"appointments": appointments, "total": len(appointments)}


@router.delete("/appointments/{appointment_id}")
async def cancel_my_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Le client annule son RDV."""
    result = cancel_appointment(appointment_id, current_user["id"])
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/appointments/{appointment_id}/accept-alternative")
async def accept_alternative_endpoint(
    appointment_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Le client accepte le nouveau créneau proposé."""
    result = accept_alternative(appointment_id, current_user["id"])
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    notify_appointment_confirmed(current_user["id"], result)
    return result


# ════════════════════════════════════════
# Routes ADMIN
# ════════════════════════════════════════

@router.get("/admin/appointments/pending")
async def admin_pending_appointments(
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Liste des RDV en attente de validation."""
    appointments = list_pending_appointments()
    return {"appointments": appointments, "total": len(appointments)}


@router.get("/admin/appointments/calendar")
async def admin_calendar(
    start_date: str,
    end_date: str,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Vue calendrier admin (RDV en attente + confirmés)."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Format YYYY-MM-DD attendu")
    
    appointments = list_all_appointments_for_calendar(start, end)
    return {"appointments": appointments}


@router.get("/admin/appointments/stats")
async def admin_appointments_stats(
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Statistiques pour le dashboard admin."""
    return get_appointments_stats()


@router.post("/admin/appointments/{appointment_id}/approve")
async def admin_approve(
    appointment_id: str,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Admin valide un RDV."""
    advisor_name = f"{current_admin.get('prenom', '')} {current_admin.get('nom', '')}".strip() or "Conseiller Attijari"
    
    result = approve_appointment(
        appointment_id=appointment_id,
        advisor_id=current_admin["id"],
        advisor_name=advisor_name,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    notify_appointment_confirmed(client_id=result["client_id"], appointment=result)
    notif_email = AuthDB.get_user_2fa_email(result["client_id"])
    if notif_email:
        threading.Thread(target=send_appointment_confirmed, args=(
            notif_email, result.get("client_name", ""), result
        ), daemon=True).start()
    return result


@router.post("/admin/appointments/{appointment_id}/reject")
async def admin_reject(
    appointment_id: str,
    req: RejectAppointmentRequest,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Admin refuse un RDV avec motif."""
    advisor_name = f"{current_admin.get('prenom', '')} {current_admin.get('nom', '')}".strip() or "Conseiller Attijari"
    
    result = reject_appointment(
        appointment_id=appointment_id,
        advisor_id=current_admin["id"],
        advisor_name=advisor_name,
        reason=req.reason,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    notify_appointment_rejected(client_id=result["client_id"], appointment=result)
    notif_email = AuthDB.get_user_2fa_email(result["client_id"])
    if notif_email:
        threading.Thread(target=send_appointment_rejected, args=(
            notif_email, result.get("client_name", ""), result
        ), daemon=True).start()
    return result


@router.post("/admin/appointments/{appointment_id}/propose-alternative")
async def admin_propose_alternative(
    appointment_id: str,
    req: ProposeAlternativeRequest,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Admin propose un autre créneau au client."""
    advisor_name = f"{current_admin.get('prenom', '')} {current_admin.get('nom', '')}".strip() or "Conseiller Attijari"
    
    result = propose_alternative(
        appointment_id=appointment_id,
        advisor_id=current_admin["id"],
        advisor_name=advisor_name,
        new_date_str=req.new_date,
        new_start_time=req.new_start_time,
        message=req.message or "",
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    notify_appointment_alternative(client_id=result["client_id"], appointment=result)
    return result


@router.post("/admin/appointments/{appointment_id}/propose-alternatives")
async def admin_propose_multiple_alternatives(
    appointment_id: str,
    req: ProposeMultipleRequest,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Admin propose 2 ou 3 créneaux au client pour reprogrammer un RDV confirmé."""
    advisor_name = f"{current_admin.get('prenom', '')} {current_admin.get('nom', '')}".strip() or "Conseiller Attijari"
    slots = [{"date": s.date, "start_time": s.start_time} for s in req.slots]

    result = propose_multiple_alternatives(
        appointment_id=appointment_id,
        advisor_id=current_admin["id"],
        advisor_name=advisor_name,
        slots=slots,
        message=req.message or "",
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    notify_appointment_multiple_alternatives(client_id=result["client_id"], appointment=result)
    notif_email = AuthDB.get_user_2fa_email(result["client_id"])
    if notif_email:
        threading.Thread(target=send_appt_multi_email, args=(
            notif_email, result.get("client_name", ""), result
        ), daemon=True).start()
    return result


@router.post("/appointments/{appointment_id}/choose-slot")
async def client_choose_slot(
    appointment_id: str,
    req: ChooseSlotRequest,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Le client choisit l'un des créneaux proposés → RDV reconfirmé."""
    result = choose_alternative_slot(
        appointment_id=appointment_id,
        client_id=current_user["id"],
        slot_index=req.slot_index,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    notify_appointment_confirmed(client_id=result["client_id"], appointment=result)
    return result


@router.post("/admin/appointments/{appointment_id}/cancel")
async def admin_cancel_confirmed_appointment(
    appointment_id: str,
    req: AdvisorCancelRequest,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Admin annule un RDV déjà confirmé (réunion urgente, imprévu). Le créneau redevient disponible."""
    advisor_name = f"{current_admin.get('prenom', '')} {current_admin.get('nom', '')}".strip() or "Conseiller Attijari"

    result = advisor_cancel_appointment(
        appointment_id=appointment_id,
        advisor_id=current_admin["id"],
        advisor_name=advisor_name,
        reason=req.reason,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    notify_appointment_cancelled_by_advisor(client_id=result["client_id"], appointment=result)
    notif_email = AuthDB.get_user_2fa_email(result["client_id"])
    if notif_email:
        threading.Thread(target=send_appt_cancelled_email, args=(
            notif_email, result.get("client_name", ""), result
        ), daemon=True).start()
    return result


@router.get("/admin/appointments/{appointment_id}")
async def admin_get_appointment_detail(
    appointment_id: str,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Détails complets d'un RDV (utile pour modal admin)."""
    appointment = get_appointment(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="RDV introuvable")
    return appointment


# ════════════════════════════════════════
# Routes NOTIFICATIONS
# ════════════════════════════════════════

@router.get("/notifications")
async def get_notifications(
    only_unread: bool = False,
    limit: int = 20,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Liste les notifications de l'utilisateur (cloche)."""
    notifications = list_notifications(
        user_id=current_user["id"],
        limit=limit,
        only_unread=only_unread,
    )
    return {
        "notifications": notifications,
        "unread_count": count_unread(current_user["id"]),
    }


@router.get("/notifications/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user_dependency),
):
    """Nombre de notifications non lues (badge cloche)."""
    return {"unread_count": count_unread(current_user["id"])}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Marque une notification comme lue."""
    success = mark_as_read(notification_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(
    current_user: dict = Depends(get_current_user_dependency),
):
    """Marque toutes les notifications comme lues."""
    count = mark_all_as_read(current_user["id"])
    return {"ok": True, "marked_count": count}


@router.delete("/notifications/{notification_id}")
async def delete_notif(
    notification_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Supprime une notification."""
    success = delete_notification(notification_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    return {"ok": True}