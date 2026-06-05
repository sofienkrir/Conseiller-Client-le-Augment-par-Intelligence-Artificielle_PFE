# api/auth_routes.py

import os
import re
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from .auth_models import UserCreate, UserLogin, UserResponse, TokenResponse
from .auth_db import AuthDB, ACCESS_TOKEN_EXPIRE_MINUTES, db, users_collection
from .two_factor import create_2fa_session, verify_code, resend_code, get_session_email
from .trusted_devices import add_trusted_device, is_device_trusted, revoke_trusted_device
from .email_service import send_2fa_code, send_login_notification, send_not_me_confirmation
from .device_tracking import register_device, mark_device_as_alerted, mark_device_not_me, get_device_by_id
from .risk_scoring import (
    log_security_incident, invalidate_all_user_sessions,
    generate_not_me_token, verify_not_me_token,
)
from datetime import timedelta

router   = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

CLIENT_CODE_RE  = re.compile(r'^ATB-\d{4}-\d{4}$')
TWO_FA_ENABLED  = os.getenv("TWO_FA_ENABLED", "true").lower() == "true"
TRUST_DAYS      = int(os.getenv("TRUSTED_DEVICE_DAYS", "30"))
FRONTEND_URL    = os.getenv("FRONTEND_URL", "http://localhost:5173")


# ── Modeles supplementaires ───────────────────────────────────────────────────

class TwoFAVerifyRequest(BaseModel):
    session_id:     str
    code:           str
    remember_device: bool = False


class TwoFAResendRequest(BaseModel):
    session_id: str


class NotMeRequest(BaseModel):
    token: str


# ── Helper: construire la reponse client enrichie ─────────────────────────────

def _build_client_info(user: dict) -> Optional[dict]:
    if user.get("is_admin") or not user.get("client_id"):
        return None
    from bson import ObjectId
    from .crypto_utils import decrypt_client_doc
    try:
        c = db.clients.find_one({"_id": ObjectId(user["client_id"])})
        if c:
            c = decrypt_client_doc(c)
            return {
                "id":                str(c["_id"]),
                "client_code":       c.get("client_code"),
                "nom":               c.get("nom", ""),
                "prenom":            c.get("prenom", ""),
                "segment":           c.get("segment"),
                "ville":             c.get("ville"),
                "profession":        c.get("profession"),
                "revenus_mensuels":  c.get("revenus_mensuels"),
                "anciennete_annees": c.get("anciennete_annees"),
            }
    except Exception:
        pass
    return None


def _mask_email(email: str) -> str:
    """Masque l'email: 'aziz.pro@yahoo.fr' -> 'az***@y***.fr'"""
    try:
        local, domain = email.split("@", 1)
        masked_local = local[:2] + "***"
        if "." in domain:
            d_name, d_ext = domain.rsplit(".", 1)
            masked_domain = d_name[0] + "***." + d_ext
        else:
            masked_domain = domain[0] + "***"
        return f"{masked_local}@{masked_domain}"
    except Exception:
        return "***@***.com"


# ── POST /auth/register ───────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    code = user_data.client_code.strip().upper()

    if not CLIENT_CODE_RE.match(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format de code client invalide. Attendu: ATB-YYYY-XXXX (ex: ATB-2026-0001)",
        )

    client_doc = db.clients.find_one({"client_code": code})
    if not client_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code client introuvable. Verifiez le code fourni par votre conseiller.",
        )

    if db.users.find_one({"client_code": code}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte existe deja pour ce client. Connectez-vous ou contactez votre conseiller.",
        )

    result = AuthDB.create_user({
        "email":       user_data.email,
        "password":    user_data.password,
        "telephone":   user_data.telephone,
        "client_code": code,
        "client_id":   client_doc["_id"],
        "nom":         client_doc.get("nom", ""),
        "prenom":      client_doc.get("prenom", ""),
        "segment":     client_doc.get("segment", "particulier"),
    })

    if "error" in result:
        if "Email already exists" in result["error"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result["error"])

    access_token = AuthDB.create_access_token(data={"sub": result["id"], "email": result["email"]})

    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user":         result,
        "client": {
            "id":          str(client_doc["_id"]),
            "client_code": code,
            "nom":         client_doc.get("nom", ""),
            "prenom":      client_doc.get("prenom", ""),
            "segment":     client_doc.get("segment"),
            "ville":       client_doc.get("ville"),
        },
    }


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: Request, user_data: UserLogin):
    # 1. Authentifier email + password
    user = AuthDB.authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Si 2FA desactive → JWT direct (mode developpement)
    if not TWO_FA_ENABLED:
        access_token = AuthDB.create_access_token(data={"sub": user["id"], "email": user["email"]})
        return {
            "access_token": access_token,
            "token_type":   "bearer",
            "user":         user,
            "client":       _build_client_info(user),
        }

    # 3. Verifier si appareil de confiance (cookie httpOnly)
    device_token = request.cookies.get("device_token")
    user_agent   = request.headers.get("user-agent", "")

    if device_token and is_device_trusted(user["id"], device_token, user_agent):
        access_token = AuthDB.create_access_token(data={"sub": user["id"], "email": user["email"]})
        print(f"[2FA] Appareil de confiance reconnu pour {user['email']}")
        return {
            "access_token": access_token,
            "token_type":   "bearer",
            "user":         user,
            "client":       _build_client_info(user),
        }

    # 4. 2FA requis — creer session et envoyer code
    ip = request.client.host if request.client else ""
    recipient_email = AuthDB.get_user_2fa_email(user["id"])
    session = create_2fa_session(user["id"], recipient_email, ip, user_agent)

    # Envoyer le code par email (ne pas logger le code)
    name  = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or recipient_email
    sent  = send_2fa_code(recipient_email, name, session["code"])

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible d'envoyer le code par email. Reessayez.",
        )

    print(f"[2FA] Code envoye a {_mask_email(recipient_email)}")

    return {
        "requires_2fa":  True,
        "session_id":    session["session_id"],
        "email_masked":  _mask_email(recipient_email),
        "expires_in":    session["expiry_minutes"] * 60,
        "message":       f"Code envoye a {_mask_email(recipient_email)}",
    }


# ── POST /auth/verify-2fa ─────────────────────────────────────────────────────

@router.post("/verify-2fa")
async def verify_2fa(request: Request, response: Response, body: TwoFAVerifyRequest):
    result = verify_code(body.session_id, body.code)

    if not result["valid"]:
        reason = result.get("reason", "Code invalide")
        if reason == "blocked":
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de tentatives incorrectes. Reconnectez-vous.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason,
            headers={"X-Attempts-Left": str(result.get("attempts_left", 0))},
        )

    # Code valide — recuperer le user
    user = AuthDB.get_user_by_id(result["user_id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur introuvable")

    # Reinitialisation requise apres incident "Ce n'etait pas moi"
    if user.get("must_reset_password"):
        reset_token = AuthDB.create_access_token(
            data={"sub": user["id"], "purpose": "password_reset_after_incident"},
            expires_delta=timedelta(minutes=15),
        )
        return {
            "requires_password_reset": True,
            "reset_token":             reset_token,
            "user_id":                 user["id"],
        }

    # Effacer force_relogin residuel (etat inconstant defensif)
    if user.get("force_relogin"):
        AuthDB.clear_force_relogin(user["id"])

    # Generer JWT
    access_token = AuthDB.create_access_token(data={"sub": user["id"], "email": user["email"]})

    # ── Phase C+: RBA — Risk-Based Authentication ─────────────────────────
    ip         = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "Unknown")
    try:
        from datetime import datetime as _dt
        device_result = register_device(user["id"], ip, user_agent)
        device      = device_result["device"]
        risk        = device_result["risk"]
        level       = risk["level"]   # LOW | MEDIUM | HIGH | CRITICAL
        alert_email = AuthDB.get_user_2fa_email(user["id"])
        name        = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or alert_email
        device_info = device.get("device_info", {})
        location    = device.get("location", {})
        now         = _dt.utcnow()

        print(f"[RBA] {_mask_email(user['email'])} — score={risk['score']} level={level} new={device_result['is_new_device']}")

        if level == "CRITICAL":
            log_security_incident(user["id"], device["id"], risk, ip, "BLOCKED")
            invalidate_all_user_sessions(user["id"])
            send_login_notification(alert_email, name, device_info, location, ip, now, severity="critical")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Activite suspecte detectee. Votre compte a ete temporairement bloque. Contactez le service client.",
            )

        elif level == "HIGH":
            not_me_token = generate_not_me_token(device["id"], user["id"])
            not_me_url   = f"{FRONTEND_URL}/report-not-me?token={not_me_token}"
            send_login_notification(alert_email, name, device_info, location, ip, now,
                                    severity="high", not_me_url=not_me_url)
            mark_device_as_alerted(device["id"])
            log_security_incident(user["id"], device["id"], risk, ip, "ALERTED")
            print(f"[RBA] HIGH alerte envoyee a {_mask_email(alert_email)}")

        elif level == "MEDIUM":
            send_login_notification(alert_email, name, device_info, location, ip, now, severity="medium")
            mark_device_as_alerted(device["id"])
            print(f"[RBA] MEDIUM notification envoyee a {_mask_email(alert_email)}")

        # LOW: log only

    except HTTPException:
        raise
    except Exception as _e:
        print(f"[RBA] Erreur device tracking (non bloquant): {_e}")
    # ─────────────────────────────────────────────────────────────────────

    # Trust device si demande
    if body.remember_device:
        device_token = add_trusted_device(user["id"], user_agent, ip)
        response.set_cookie(
            key="device_token",
            value=device_token,
            max_age=TRUST_DAYS * 86400,
            httponly=True,
            samesite="lax",
            secure=False,   # True en production HTTPS
        )
        print(f"[2FA] Appareil de confiance enregistre pour {_mask_email(user['email'])}")

    print(f"[2FA] Authentification reussie pour {_mask_email(user['email'])}")

    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user":         user,
        "client":       _build_client_info(user),
    }


# ── POST /auth/resend-2fa ─────────────────────────────────────────────────────

@router.post("/resend-2fa")
async def resend_2fa(body: TwoFAResendRequest):
    result = resend_code(body.session_id)

    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    # Recuperer email depuis session pour re-envoyer
    email = get_session_email(body.session_id)
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session introuvable")

    # Chercher le nom du user
    user_doc = AuthDB.get_user_by_email(email)
    name = f"{user_doc.get('prenom', '')} {user_doc.get('nom', '')}".strip() if user_doc else email

    sent = send_2fa_code(email, name, result["code"])
    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur d'envoi email. Reessayez.",
        )

    print(f"[2FA] Code renvoye a {_mask_email(email)} (renvoi #{result['resend_count']})")

    return {
        "message":       f"Nouveau code envoye a {_mask_email(email)}",
        "expires_in":    result["expiry_minutes"] * 60,
        "resend_count":  result["resend_count"],
    }


# ── POST /auth/report-not-me ─────────────────────────────────────────────────

@router.post("/report-not-me")
async def report_not_me(request: Request, body: NotMeRequest):
    """
    Signalement 'Ce n'etait pas moi' via token HMAC signe.
    Aucun JWT requis — le token est le mecanisme d'auth.
    Actions: revoque device, invalide toutes sessions, log incident, email confirmation.
    """
    data = verify_not_me_token(body.token)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalide ou expire. Utilisez le lien recu dans l'email d'alerte.",
        )
    if data.get("error") == "TOKEN_ALREADY_USED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce lien a deja ete utilise. Votre compte a deja ete securise. Reconnectez-vous.",
            headers={"X-Error-Code": "TOKEN_ALREADY_USED"},
        )

    device_id = data["device_id"]
    user_id   = data["user_id"]

    user = AuthDB.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    device = get_device_by_id(device_id)

    # Bloquer le device et invalider toutes les sessions
    mark_device_not_me(device_id)
    invalidate_all_user_sessions(user_id)

    # Log incident de securite
    ip = request.client.host if request.client else ""
    risk_summary = {
        "score":   100,
        "level":   "CRITICAL",
        "factors": [{"name": "not_me_reported", "points": 100,
                     "details": "Utilisateur a signale une connexion non autorisee", "icon": "🚨"}],
        "action":  "BLOCK",
    }
    log_security_incident(user_id, device_id, risk_summary, ip, "NOT_ME_REPORTED")

    # Email de confirmation
    from datetime import datetime as _dt
    alert_email = AuthDB.get_user_2fa_email(user_id)
    name        = f"{user.get('prenom', '')} {user.get('nom', '')}".strip() or alert_email
    send_not_me_confirmation(
        to_email    = alert_email,
        user_name   = name,
        device_info = device.get("device_info", {}) if device else {},
        location    = device.get("location", {}) if device else {},
        ip          = device.get("ip_address", "") if device else "",
        timestamp   = _dt.utcnow(),
    )

    print(f"[RBA] NOT_ME signale: user={_mask_email(user.get('email', ''))} device={device_id}")

    return {
        "success": True,
        "message": "Votre compte a ete securise. Toutes les sessions ont ete bloquees. Reconnectez-vous avec un nouveau mot de passe.",
    }


# ── POST /auth/reset-password-after-incident ─────────────────────────────────

class ResetPasswordAfterIncidentRequest(BaseModel):
    reset_token:  str
    new_password: str


@router.post("/reset-password-after-incident")
async def reset_password_after_incident(body: ResetPasswordAfterIncidentRequest):
    """
    Permet a un utilisateur bloque (must_reset_password=True) de definir un nouveau
    mot de passe apres avoir confirme "Ce n'etait pas moi".
    Necessite le reset_token issu par verify-2fa (valable 15 min).
    """
    payload = AuthDB.verify_token(body.reset_token)
    if not payload or payload.get("purpose") != "password_reset_after_incident":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lien de reinitialisation invalide ou expire (15 min). Reconnectez-vous.",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalide")

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 8 caracteres.",
        )

    result = AuthDB.reset_password_after_incident(user_id, body.new_password)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["error"])

    user = AuthDB.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    access_token = AuthDB.create_access_token(data={"sub": user["id"], "email": user["email"]})
    print(f"[SECURITY] Mot de passe reinitialise apres incident: {_mask_email(user.get('email', ''))}")

    return {
        "access_token": access_token,
        "token_type":   "bearer",
        "user":         user,
        "client":       _build_client_info(user),
        "message":      "Mot de passe mis a jour. Compte securise.",
    }


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(request: Request, response: Response):
    device_token = request.cookies.get("device_token")
    if device_token:
        revoke_trusted_device(device_token)
        response.delete_cookie("device_token")
    return {"message": "Deconnecte avec succes"}


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token   = credentials.credentials
    payload = AuthDB.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = AuthDB.get_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.get("force_relogin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidee pour raisons de securite. Reconnectez-vous.",
        )
    return user


# ── Dependencies ──────────────────────────────────────────────────────────────

async def get_current_user_dependency(token: str = Depends(HTTPBearer())):
    payload = AuthDB.verify_token(token.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    user = AuthDB.get_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.get("force_relogin"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidee pour raisons de securite. Reconnectez-vous.",
        )
    return user


async def get_current_admin_dependency(current_user: dict = Depends(get_current_user_dependency)) -> dict:
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acces refuse: privileges administrateur requis.")
    return current_user
