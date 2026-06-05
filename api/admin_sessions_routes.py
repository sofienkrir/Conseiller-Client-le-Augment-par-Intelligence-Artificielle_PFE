# api/admin_sessions_routes.py
"""
Phase C — Endpoints admin pour la gestion des sessions/devices.
Toutes les routes requièrent le rôle admin.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from .auth_routes import get_current_admin_dependency
from .device_tracking import (
    list_all_active_sessions,
    get_sessions_stats,
    revoke_device,
    mark_device_suspicious,
    mark_device_legitimate,
    get_device_by_id,
    list_user_devices,
)
from .risk_scoring import invalidate_all_user_sessions, log_security_incident
from .email_service import send_email

router = APIRouter(prefix="/admin/sessions", tags=["Admin - Sessions"])


# ── GET /admin/sessions ───────────────────────────────────────────────────────

@router.get("")
async def get_sessions(
    days:        int = Query(7,     ge=1, le=365),
    status:      str = Query("all", regex="^(all|active|suspicious|revoked)$"),
    user_email:  str = Query(""),
    current_admin = Depends(get_current_admin_dependency),
):
    """Liste toutes les sessions récentes (filtrées)."""
    sessions = list_all_active_sessions(
        days=days,
        status_filter=status,
        user_email=user_email,
    )
    return {"sessions": sessions, "total": len(sessions)}


# ── GET /admin/sessions/stats ─────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    days: int = Query(7, ge=1, le=365),
    current_admin = Depends(get_current_admin_dependency),
):
    """Statistiques globales des sessions."""
    return get_sessions_stats(days=days)


# ── GET /admin/sessions/by-user/{user_id} ────────────────────────────────────

@router.get("/by-user/{user_id}")
async def get_user_sessions(
    user_id: str,
    current_admin = Depends(get_current_admin_dependency),
):
    """Tous les devices d'un utilisateur spécifique."""
    devices = list_user_devices(user_id, limit=100)
    return {"devices": devices, "total": len(devices)}


# ── PUT /admin/sessions/{device_id}/revoke ────────────────────────────────────

@router.put("/{device_id}/revoke")
async def revoke_session(
    device_id: str,
    current_admin = Depends(get_current_admin_dependency),
):
    """Admin révoque manuellement un device."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device introuvable")

    result = revoke_device(device_id, current_admin["id"])
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # Notifier l'utilisateur par email (non bloquant)
    user_notified = False
    try:
        user_email = device.get("user_email", "")
        if user_email and "@" in user_email:
            user_nom    = device.get("user_nom", "")
            user_prenom = device.get("user_prenom", "")
            name        = f"{user_prenom} {user_nom}".strip() or user_email
            d           = device.get("device_info", {})
            browser     = d.get("browser", "Navigateur inconnu")
            os_name     = d.get("os", "")
            device_str  = f"{browser} / {os_name}".strip(" /")
            html = f"""
<p>Bonjour {name},</p>
<p>Un administrateur Attijari Bank a <strong>révoqué</strong> l'accès d'un appareil
à votre compte :</p>
<p style="background:#FEF2F2;padding:12px 16px;border-radius:8px;border-left:4px solid #CC0000;">
  📱 Appareil : <strong>{device_str}</strong><br>
  🌐 IP : {device.get('ip_address', '—')}
</p>
<p>Si vous avez des questions, contactez votre conseiller.</p>
<p style="color:#888;font-size:12px;">Attijari Bank — Sécurité des comptes</p>
"""
            user_notified = send_email(
                to=user_email,
                subject="[Attijari Bank] Accès révoqué sur un appareil",
                html_body=html,
            )
    except Exception:
        pass

    print(f"[SESSIONS] Device {device_id} revoque par admin {current_admin['email']}")

    return {
        "success":        True,
        "device_id":      device_id,
        "user_notified":  user_notified,
    }


# ── PUT /admin/sessions/{device_id}/flag-suspicious ──────────────────────────

@router.put("/{device_id}/flag-suspicious")
async def flag_suspicious(
    device_id: str,
    current_admin = Depends(get_current_admin_dependency),
):
    """Marque un device comme suspect."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device introuvable")

    result = mark_device_suspicious(device_id, reason=f"Signale par admin {current_admin['email']}")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    print(f"[SESSIONS] Device {device_id} marque suspect par admin {current_admin['email']}")
    return {"success": True, "device_id": device_id}


# ── PUT /admin/sessions/{device_id}/mark-legitimate ──────────────────────────

@router.put("/{device_id}/mark-legitimate")
async def mark_legitimate(
    device_id: str,
    current_admin = Depends(get_current_admin_dependency),
):
    """Marque un device comme légitime (remet statut active, risk LOW)."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device introuvable")

    result = mark_device_legitimate(device_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    print(f"[SESSIONS] Device {device_id} marque legitime par admin {current_admin['email']}")
    return {"success": True, "device_id": device_id}


# ── PUT /admin/sessions/{device_id}/force-logout ──────────────────────────────

@router.put("/{device_id}/force-logout")
async def force_logout_device_owner(
    device_id: str,
    current_admin = Depends(get_current_admin_dependency),
):
    """Force la déconnexion complète de l'utilisateur propriétaire du device."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device introuvable")

    user_id = device.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id introuvable pour ce device")

    invalidate_all_user_sessions(user_id)

    risk_admin = {
        "score":   100,
        "level":   "CRITICAL",
        "factors": [{"name": "admin_force_logout", "points": 100,
                     "details": f"Force logout par admin {current_admin['email']}", "icon": "⚡"}],
        "action":  "BLOCK",
    }
    log_security_incident(user_id, device_id, risk_admin, "", "ADMIN_FORCE_LOGOUT")

    print(f"[SESSIONS] Force logout user={user_id} par admin {current_admin['email']}")
    return {"success": True, "user_id": user_id, "device_id": device_id}
