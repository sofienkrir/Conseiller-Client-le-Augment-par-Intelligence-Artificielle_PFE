# api/email_service.py
"""
Service d'envoi d'emails via Gmail SMTP.
Utilise smtplib (stdlib) — aucune dependance externe.

Variables .env requises:
  GMAIL_USER         : adresse Gmail expeditrice
  GMAIL_APP_PASSWORD : mot de passe d'application Google (16 chars)
"""

import smtplib
import os
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv(override=True)

GMAIL_USER     = os.getenv("GMAIL_USER", "")
GMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
TWO_FA_EXPIRY  = int(os.getenv("TWO_FA_CODE_EXPIRY_MINUTES", "10"))


# ════════════════════════════════════════════════════
# Envoi generique
# ════════════════════════════════════════════════════

def send_email(to: str, subject: str, html_body: str) -> bool:
    """
    Envoie un email HTML via Gmail SMTP (TLS port 587).
    Retourne True si envoye, False sinon.
    Ne leve jamais d'exception (echec silencieux logge).
    """
    if not GMAIL_USER or not GMAIL_PASSWORD:
        print("[EMAIL] GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans .env", file=sys.stderr)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Attijari Bank <{GMAIL_USER}>"
    msg["To"]      = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to, msg.as_string())
        print(f"[EMAIL] Envoye a {to} — sujet: {subject}")
        return True
    except smtplib.SMTPAuthenticationError:
        print("[EMAIL] Erreur d'authentification Gmail — verifiez GMAIL_APP_PASSWORD", file=sys.stderr)
    except smtplib.SMTPException as e:
        print(f"[EMAIL] Erreur SMTP: {e}", file=sys.stderr)
    except Exception as e:
        print(f"[EMAIL] Erreur inattendue: {e}", file=sys.stderr)
    return False


# ════════════════════════════════════════════════════
# Template email 2FA
# ════════════════════════════════════════════════════

def _build_2fa_html(user_name: str, code: str, expiry_minutes: int) -> str:
    digits = "  ".join(list(code))
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de verification Attijari Bank</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#F5A623 0%,#E8521A 45%,#CC0000 100%);
                     border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <!-- Logo SVG inline -->
              <svg width="44" height="34" viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6 C4 6, 8 32, 13 32 C18 32, 18 10, 24 10 C30 10, 30 32, 35 32 C40 32, 44 6, 44 6"
                  stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <div style="text-align:left;">
                <div style="font-size:20px;font-weight:700;color:white;letter-spacing:-0.01em;">
                  Attijari<span style="font-weight:300;">bank</span>
                </div>
                <div style="font-size:9px;color:rgba(255,255,255,0.75);font-style:italic;letter-spacing:0.06em;">
                  Croire en vous
                </div>
              </div>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#FFFFFF;padding:40px 40px 32px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">

            <!-- Salutation -->
            <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">
              Bonjour {user_name},
            </p>
            <p style="font-size:14px;color:#475569;margin:0 0 32px;line-height:1.6;">
              Vous avez initie une connexion a votre espace Attijari Bank.<br>
              Utilisez le code ci-dessous pour finaliser votre authentification.
            </p>

            <!-- Code Box -->
            <div style="background:linear-gradient(135deg,#FFF7ED,#FFF1F2);
                        border:2px solid #FED7AA;border-radius:16px;
                        padding:28px 24px;text-align:center;margin:0 0 28px;">
              <p style="font-size:11px;font-weight:700;color:#92400E;
                        text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;">
                Code de verification
              </p>
              <div style="font-size:40px;font-weight:800;letter-spacing:0.35em;
                          color:#CC0000;font-family:'Courier New',monospace;
                          text-shadow:0 2px 4px rgba(204,0,0,0.15);">
                {digits}
              </div>
              <p style="font-size:12px;color:#92400E;margin:14px 0 0;">
                Ce code expire dans <strong>{expiry_minutes} minutes</strong>
              </p>
            </div>

            <!-- Instructions -->
            <ol style="font-size:13px;color:#475569;padding-left:20px;margin:0 0 28px;line-height:2;">
              <li>Retournez sur la page de connexion Attijari Bank</li>
              <li>Saisissez ce code dans le champ de verification</li>
              <li>Acces accorde immediatement</li>
            </ol>

            <!-- Security warning -->
            <div style="background:#FEF2F2;border-left:4px solid #CC0000;
                        border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 8px;">
              <p style="font-size:13px;color:#991B1B;margin:0;font-weight:600;">
                Securite importante
              </p>
              <p style="font-size:12px;color:#7F1D1D;margin:6px 0 0;line-height:1.5;">
                Ne partagez jamais ce code — meme avec un employe Attijari Bank.<br>
                Si vous n'avez pas initie cette connexion, ignorez cet email.
              </p>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;
                     border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
              Attijari Bank Tunisie &mdash; Conseiller Digital Intelligent<br>
              Cet email a ete envoye automatiquement. Ne pas repondre.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>"""


def send_new_device_alert(
    to_email: str,
    user_name: str,
    device_info: dict,
    location: dict,
    ip: str,
    timestamp,
) -> bool:
    """
    Email d'alerte: nouvelle connexion depuis un device inconnu.
    Ne lève jamais d'exception.
    """
    from datetime import datetime as _dt
    if isinstance(timestamp, _dt):
        ts_str = timestamp.strftime("%d/%m/%Y à %H:%M UTC")
    else:
        ts_str = str(timestamp)

    browser   = device_info.get("browser", "Navigateur inconnu")
    bv        = device_info.get("browser_version", "")
    os_name   = device_info.get("os", "OS inconnu")
    dev_type  = device_info.get("device_type", "Desktop")
    country   = location.get("country", "")
    city      = location.get("city", "")
    location_str = f"{city}, {country}".strip(", ") or "Localisation inconnue"
    browser_str  = f"{browser} {bv}".strip() if bv else browser
    device_str   = f"{browser_str} · {os_name} · {dev_type}"

    # Masquer les 2 derniers octets de l'IP
    ip_parts    = ip.split(".")
    ip_masked   = ".".join(ip_parts[:2] + ["xxx", "xxx"]) if len(ip_parts) == 4 else ip

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Alerte de sécurité Attijari Bank</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header rouge alerte -->
        <tr>
          <td style="background:linear-gradient(135deg,#991B1B 0%,#CC0000 100%);
                     border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:12px;">
              <svg width="44" height="34" viewBox="0 0 48 38" fill="none">
                <path d="M4 6 C4 6,8 32,13 32 C18 32,18 10,24 10 C30 10,30 32,35 32 C40 32,44 6,44 6"
                  stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <div style="text-align:left;">
                <div style="font-size:20px;font-weight:700;color:white;">
                  Attijari<span style="font-weight:300;">bank</span>
                </div>
                <div style="font-size:9px;color:rgba(255,255,255,0.7);font-style:italic;letter-spacing:0.06em;">
                  Croire en vous
                </div>
              </div>
            </div>
            <div style="margin-top:18px;display:inline-flex;align-items:center;gap:8px;
                        background:rgba(255,255,255,0.15);border-radius:20px;padding:6px 16px;">
              <span style="font-size:18px;">🔐</span>
              <span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">
                ALERTE DE SÉCURITÉ
              </span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#FFFFFF;padding:36px 40px 28px;
                     border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">

            <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">
              Bonjour {user_name},
            </p>
            <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6;">
              Une connexion à votre compte Attijari Bank a été détectée
              depuis un <strong style="color:#CC0000;">appareil non reconnu</strong>.
            </p>

            <!-- Détails connexion -->
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;
                        padding:20px 24px;margin:0 0 24px;">
              <p style="font-size:11px;font-weight:700;color:#991B1B;
                        text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">
                Détails de la connexion
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#6B7280;width:130px;">📱 Appareil</td>
                  <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{device_str}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#6B7280;">🌍 Localisation</td>
                  <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{location_str}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#6B7280;">🌐 Adresse IP</td>
                  <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{ip_masked}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:13px;color:#6B7280;">⏰ Date</td>
                  <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{ts_str}</td>
                </tr>
              </table>
            </div>

            <!-- C'était vous? -->
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;
                        padding:14px 18px;margin:0 0 16px;">
              <p style="font-size:13px;color:#166534;margin:0;font-weight:600;">
                ✅ Si c'était bien vous
              </p>
              <p style="font-size:12px;color:#166534;margin:6px 0 0;line-height:1.5;">
                Vous pouvez ignorer cet email en toute sécurité.
                Votre connexion a été authentifiée avec succès.
              </p>
            </div>

            <!-- Ce n'était pas vous -->
            <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;
                        padding:14px 18px;margin:0 0 28px;">
              <p style="font-size:13px;color:#92400E;margin:0;font-weight:600;">
                ⚠️ Si ce n'était PAS vous
              </p>
              <ul style="font-size:12px;color:#92400E;margin:8px 0 0;padding-left:18px;line-height:1.9;">
                <li>Changez immédiatement votre mot de passe</li>
                <li>Contactez votre conseiller Attijari Bank</li>
                <li>Appelez le service client: <strong>71 141 141</strong></li>
              </ul>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;
                     border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
            <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
              Attijari Bank Tunisie &mdash; Sécurité des comptes<br>
              Cet email est généré automatiquement pour votre sécurité. Ne pas répondre.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return send_email(
        to=to_email,
        subject="🔐 Nouvelle connexion détectée — Attijari Bank",
        html_body=html,
    )


def send_login_notification(
    to_email:    str,
    user_name:   str,
    device_info: dict,
    location:    dict,
    ip:          str,
    timestamp,
    severity:    str,           # "medium" | "high" | "critical"
    not_me_url:  str = None,    # requis pour severity="high"
) -> bool:
    """
    Notification de connexion RBA.
    - medium   : info bleue (connexion inhabituelle, non bloquante)
    - high     : alerte orange + bouton 'Ce n'etait pas moi'
    - critical : rouge urgent, compte bloque
    """
    from datetime import datetime as _dt
    ts_str = timestamp.strftime("%d/%m/%Y à %H:%M UTC") if isinstance(timestamp, _dt) else str(timestamp)

    browser      = device_info.get("browser", "Navigateur inconnu")
    bv           = device_info.get("browser_version", "")
    os_name      = device_info.get("os", "OS inconnu")
    dev_type     = device_info.get("device_type", "Desktop")
    country      = location.get("country", "")
    city         = location.get("city", "")
    location_str = f"{city}, {country}".strip(", ") or "Localisation inconnue"
    browser_str  = f"{browser} {bv}".strip() if bv else browser
    device_str   = f"{browser_str} · {os_name} · {dev_type}"

    ip_parts   = ip.split(".")
    ip_masked  = ".".join(ip_parts[:2] + ["xxx", "xxx"]) if len(ip_parts) == 4 else ip

    _LOGO_SVG = """<svg width="44" height="34" viewBox="0 0 48 38" fill="none">
      <path d="M4 6 C4 6,8 32,13 32 C18 32,18 10,24 10 C30 10,30 32,35 32 C40 32,44 6,44 6"
        stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>"""

    _LOGO_BLOCK = f"""
      <div style="display:inline-flex;align-items:center;gap:12px;">
        {_LOGO_SVG}
        <div style="text-align:left;">
          <div style="font-size:20px;font-weight:700;color:white;">Attijari<span style="font-weight:300;">bank</span></div>
          <div style="font-size:9px;color:rgba(255,255,255,0.7);font-style:italic;letter-spacing:0.06em;">Croire en vous</div>
        </div>
      </div>"""

    _DETAILS_TABLE = f"""
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:5px 0;font-size:13px;color:#6B7280;width:130px;">📱 Appareil</td>
            <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{device_str}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#6B7280;">🌍 Localisation</td>
            <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{location_str}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#6B7280;">🌐 Adresse IP</td>
            <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{ip_masked}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#6B7280;">⏰ Date</td>
            <td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{ts_str}</td></tr>
      </table>"""

    _FOOTER = """
      <tr>
        <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;
                   border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
          <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
            Attijari Bank Tunisie &mdash; Sécurité des comptes<br>
            Cet email est généré automatiquement pour votre sécurité. Ne pas répondre.
          </p>
        </td>
      </tr>"""

    if severity == "critical":
        subject = "🚨 URGENT — Activité suspecte détectée — Attijari Bank"
        header_bg = "linear-gradient(135deg,#7F1D1D 0%,#991B1B 100%)"
        badge = '<span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">🚨 ALERTE CRITIQUE</span>'
        body = f"""
          <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
          <p style="font-size:14px;color:#475569;margin:0 0 20px;line-height:1.6;">
            Une activité <strong style="color:#991B1B;">hautement suspecte</strong> a été détectée sur votre compte.
            Pour votre protection, <strong>toutes vos sessions ont été bloquées</strong>.
          </p>
          <div style="background:#FEE2E2;border:1px solid #FECACA;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
            <p style="font-size:11px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">
              Connexion suspecte détectée
            </p>
            {_DETAILS_TABLE}
          </div>
          <div style="background:#FEE2E2;border-left:4px solid #991B1B;border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 20px;">
            <p style="font-size:13px;color:#7F1D1D;margin:0;font-weight:600;">Actions requises immédiatement</p>
            <ul style="font-size:12px;color:#7F1D1D;margin:8px 0 0;padding-left:18px;line-height:2;">
              <li>Reconnectez-vous et changez votre mot de passe</li>
              <li>Vérifiez les transactions récentes de votre compte</li>
              <li>Contactez le service client: <strong>71 141 141</strong></li>
            </ul>
          </div>"""

    elif severity == "high":
        subject = "⚠️ Connexion inhabituelle détectée — Attijari Bank"
        header_bg = "linear-gradient(135deg,#92400E 0%,#D97706 100%)"
        badge = '<span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">⚠️ ALERTE DE SÉCURITÉ</span>'
        not_me_btn = ""
        if not_me_url:
            not_me_btn = f"""
          <div style="text-align:center;margin:0 0 20px;">
            <a href="{not_me_url}"
               style="display:inline-block;background:#D97706;color:white;font-size:14px;font-weight:700;
                      padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
              ⚠️ Ce n'était pas moi — Sécuriser mon compte
            </a>
            <p style="font-size:11px;color:#6B7280;margin:8px 0 0;">Ce lien est valable 48 heures</p>
          </div>"""
        body = f"""
          <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
          <p style="font-size:14px;color:#475569;margin:0 0 20px;line-height:1.6;">
            Une connexion <strong style="color:#D97706;">inhabituelle</strong> a été détectée sur votre compte.
            Si c'était bien vous, vous pouvez ignorer cet email.
          </p>
          <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
            <p style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">
              Détails de la connexion
            </p>
            {_DETAILS_TABLE}
          </div>
          {not_me_btn}
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px;">
            <p style="font-size:13px;color:#166534;margin:0;font-weight:600;">✅ Si c'était bien vous</p>
            <p style="font-size:12px;color:#166534;margin:6px 0 0;">Aucune action requise. Votre connexion est sécurisée.</p>
          </div>"""

    else:  # medium
        subject = "ℹ️ Nouvelle connexion à votre compte — Attijari Bank"
        header_bg = "linear-gradient(135deg,#1E40AF 0%,#2563EB 100%)"
        badge = '<span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">ℹ️ INFORMATION DE SÉCURITÉ</span>'
        body = f"""
          <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
          <p style="font-size:14px;color:#475569;margin:0 0 20px;line-height:1.6;">
            Une connexion à votre compte Attijari Bank a été effectuée depuis un
            <strong>emplacement ou appareil inhabituel</strong>.
          </p>
          <div style="background:#DBEAFE;border:1px solid #BFDBFE;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
            <p style="font-size:11px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">
              Détails de la connexion
            </p>
            {_DETAILS_TABLE}
          </div>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px;margin:0 0 12px;">
            <p style="font-size:13px;color:#166534;margin:0;font-weight:600;">✅ Si c'était bien vous</p>
            <p style="font-size:12px;color:#166534;margin:6px 0 0;">Aucune action requise.</p>
          </div>
          <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:14px 18px;">
            <p style="font-size:13px;color:#92400E;margin:0;font-weight:600;">⚠️ Si ce n'était pas vous</p>
            <p style="font-size:12px;color:#92400E;margin:6px 0 0;">
              Changez votre mot de passe et contactez le <strong>71 141 141</strong>.
            </p>
          </div>"""

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:{header_bg};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            {_LOGO_BLOCK}
            <div style="margin-top:16px;display:inline-flex;align-items:center;
                        background:rgba(255,255,255,0.15);border-radius:20px;padding:6px 16px;">
              {badge}
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:36px 40px 28px;
                     border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            {body}
          </td>
        </tr>
        {_FOOTER}
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return send_email(to=to_email, subject=subject, html_body=html)


def send_not_me_confirmation(
    to_email:    str,
    user_name:   str,
    device_info: dict,
    location:    dict,
    ip:          str,
    timestamp,
) -> bool:
    """
    Email de confirmation apres signalement 'Ce n'etait pas moi'.
    Confirme que le compte a ete securise et les sessions bloquees.
    """
    from datetime import datetime as _dt
    ts_str = timestamp.strftime("%d/%m/%Y à %H:%M UTC") if isinstance(timestamp, _dt) else str(timestamp)

    browser      = device_info.get("browser", "Navigateur inconnu")
    bv           = device_info.get("browser_version", "")
    os_name      = device_info.get("os", "")
    country      = location.get("country", "")
    city         = location.get("city", "")
    location_str = f"{city}, {country}".strip(", ") or "Localisation inconnue"
    browser_str  = f"{browser} {bv}".strip() if bv else browser
    device_str   = f"{browser_str} · {os_name}".strip(" ·") if os_name else browser_str

    ip_parts  = ip.split(".")
    ip_masked = ".".join(ip_parts[:2] + ["xxx", "xxx"]) if len(ip_parts) == 4 else ip

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr>
          <td style="background:linear-gradient(135deg,#064E3B 0%,#059669 100%);
                     border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:12px;">
              <svg width="44" height="34" viewBox="0 0 48 38" fill="none">
                <path d="M4 6 C4 6,8 32,13 32 C18 32,18 10,24 10 C30 10,30 32,35 32 C40 32,44 6,44 6"
                  stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <div style="text-align:left;">
                <div style="font-size:20px;font-weight:700;color:white;">Attijari<span style="font-weight:300;">bank</span></div>
                <div style="font-size:9px;color:rgba(255,255,255,0.7);font-style:italic;letter-spacing:0.06em;">Croire en vous</div>
              </div>
            </div>
            <div style="margin-top:16px;display:inline-flex;align-items:center;
                        background:rgba(255,255,255,0.15);border-radius:20px;padding:6px 16px;">
              <span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">
                ✅ COMPTE SÉCURISÉ
              </span>
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:#FFFFFF;padding:36px 40px 28px;
                     border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
            <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6;">
              Suite à votre signalement, votre compte Attijari Bank a été
              <strong style="color:#059669;">immédiatement sécurisé</strong>.
            </p>

            <!-- Actions effectuées -->
            <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
              <p style="font-size:11px;font-weight:700;color:#065F46;text-transform:uppercase;
                        letter-spacing:0.1em;margin:0 0 14px;">Actions de sécurité effectuées</p>
              <ul style="font-size:13px;color:#065F46;margin:0;padding-left:20px;line-height:2.2;">
                <li>✅ Toutes vos sessions actives ont été <strong>bloquées</strong></li>
                <li>✅ L'appareil suspect a été <strong>révoqué</strong></li>
                <li>✅ Un incident de sécurité a été <strong>enregistré</strong></li>
              </ul>
            </div>

            <!-- Appareil signalé -->
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px 24px;margin:0 0 20px;">
              <p style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;
                        letter-spacing:0.1em;margin:0 0 12px;">Appareil signalé</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;width:130px;">📱 Appareil</td>
                    <td style="padding:4px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{device_str}</td></tr>
                <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">🌍 Localisation</td>
                    <td style="padding:4px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{location_str}</td></tr>
                <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">🌐 IP</td>
                    <td style="padding:4px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{ip_masked}</td></tr>
                <tr><td style="padding:4px 0;font-size:13px;color:#6B7280;">⏰ Date</td>
                    <td style="padding:4px 0;font-size:13px;color:#1A1A1A;font-weight:600;">{ts_str}</td></tr>
              </table>
            </div>

            <!-- Prochaines étapes -->
            <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;">
              <p style="font-size:13px;color:#92400E;margin:0;font-weight:600;">Prochaines étapes requises</p>
              <ol style="font-size:12px;color:#92400E;margin:8px 0 0;padding-left:18px;line-height:2;">
                <li>Reconnectez-vous sur Attijari Bank</li>
                <li>Changez votre mot de passe immédiatement</li>
                <li>Vérifiez vos transactions récentes</li>
                <li>Contactez le service client si nécessaire: <strong>71 141 141</strong></li>
              </ol>
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;
                     border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
            <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
              Attijari Bank Tunisie &mdash; Sécurité des comptes<br>
              Cet email est généré automatiquement pour votre sécurité. Ne pas répondre.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    return send_email(
        to=to_email,
        subject="✅ Compte sécurisé — Action confirmée — Attijari Bank",
        html_body=html,
    )


def send_appointment_confirmed(to_email: str, user_name: str, appointment: dict) -> bool:
    """Email de confirmation de RDV envoyé au client."""
    date_str   = appointment.get("date", "")
    start_time = appointment.get("start_time", "")
    end_time   = appointment.get("end_time", "")
    motif      = appointment.get("motif_label", "")
    advisor    = appointment.get("advisor_name", "votre conseiller")

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#064E3B 0%,#059669 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:12px;">
              <svg width="44" height="34" viewBox="0 0 48 38" fill="none">
                <path d="M4 6 C4 6,8 32,13 32 C18 32,18 10,24 10 C30 10,30 32,35 32 C40 32,44 6,44 6" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <div style="text-align:left;">
                <div style="font-size:20px;font-weight:700;color:white;">Attijari<span style="font-weight:300;">bank</span></div>
                <div style="font-size:9px;color:rgba(255,255,255,0.7);font-style:italic;letter-spacing:0.06em;">Croire en vous</div>
              </div>
            </div>
            <div style="margin-top:16px;display:inline-flex;align-items:center;background:rgba(255,255,255,0.15);border-radius:20px;padding:6px 16px;">
              <span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">✅ RENDEZ-VOUS CONFIRMÉ</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:36px 40px 28px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
            <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6;">
              Votre demande de rendez-vous a été <strong style="color:#059669;">acceptée</strong> par votre conseiller Attijari Bank.
            </p>
            <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
              <p style="font-size:11px;font-weight:700;color:#065F46;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 14px;">Détails de votre rendez-vous</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="padding:6px 0;font-size:13px;color:#065F46;width:130px;">📅 Date</td>
                    <td style="padding:6px 0;font-size:14px;color:#064E3B;font-weight:700;">{date_str}</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#065F46;">🕐 Heure</td>
                    <td style="padding:6px 0;font-size:14px;color:#064E3B;font-weight:700;">{start_time} – {end_time}</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#065F46;">💼 Motif</td>
                    <td style="padding:6px 0;font-size:13px;color:#064E3B;font-weight:600;">{motif}</td></tr>
                <tr><td style="padding:6px 0;font-size:13px;color:#065F46;">👤 Conseiller</td>
                    <td style="padding:6px 0;font-size:13px;color:#064E3B;font-weight:600;">{advisor}</td></tr>
              </table>
            </div>
            <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;">
              <p style="font-size:13px;color:#92400E;margin:0;font-weight:600;">Rappel</p>
              <p style="font-size:12px;color:#92400E;margin:6px 0 0;line-height:1.6;">
                Présentez-vous à l'agence 5 minutes avant l'heure prévue.<br>
                Pour annuler, accédez à la section <strong>Mes rendez-vous</strong> au moins 24h à l'avance.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
            <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
              Attijari Bank Tunisie — Service clientèle<br>
              Cet email est généré automatiquement. Ne pas répondre.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return send_email(to=to_email, subject="✅ Rendez-vous confirmé — Attijari Bank", html_body=html)


def send_appointment_rejected(to_email: str, user_name: str, appointment: dict) -> bool:
    """Email de refus de RDV envoyé au client."""
    date_str = appointment.get("date", "")
    start_time = appointment.get("start_time", "")
    motif      = appointment.get("motif_label", "")
    reason     = appointment.get("rejection_reason", "")

    reason_block = ""
    if reason:
        reason_block = f"""
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 18px;margin:0 0 20px;">
              <p style="font-size:13px;color:#991B1B;margin:0;font-weight:600;">Motif du refus</p>
              <p style="font-size:13px;color:#7F1D1D;margin:8px 0 0;line-height:1.6;">{reason}</p>
            </div>"""

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#7F1D1D 0%,#CC0000 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:12px;">
              <svg width="44" height="34" viewBox="0 0 48 38" fill="none">
                <path d="M4 6 C4 6,8 32,13 32 C18 32,18 10,24 10 C30 10,30 32,35 32 C40 32,44 6,44 6" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <div style="text-align:left;">
                <div style="font-size:20px;font-weight:700;color:white;">Attijari<span style="font-weight:300;">bank</span></div>
                <div style="font-size:9px;color:rgba(255,255,255,0.7);font-style:italic;letter-spacing:0.06em;">Croire en vous</div>
              </div>
            </div>
            <div style="margin-top:16px;display:inline-flex;align-items:center;background:rgba(255,255,255,0.15);border-radius:20px;padding:6px 16px;">
              <span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">❌ RENDEZ-VOUS NON DISPONIBLE</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:36px 40px 28px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
            <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6;">
              Nous vous informons que votre demande de rendez-vous du <strong>{date_str} à {start_time}</strong> ({motif}) n'a pas pu être acceptée.
            </p>
            {reason_block}
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px;">
              <p style="font-size:13px;color:#166534;margin:0;font-weight:600;">Que faire ?</p>
              <p style="font-size:12px;color:#166534;margin:6px 0 0;line-height:1.6;">
                Vous pouvez soumettre une nouvelle demande depuis la section <strong>Prendre un RDV</strong> en choisissant un autre créneau disponible.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
            <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
              Attijari Bank Tunisie — Service clientèle<br>
              Cet email est généré automatiquement. Ne pas répondre.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return send_email(to=to_email, subject="❌ Demande de rendez-vous — Attijari Bank", html_body=html)


def send_appointment_multiple_alternatives(to_email: str, user_name: str, appointment: dict) -> bool:
    """Email envoyé au client quand l'admin propose plusieurs créneaux alternatifs."""
    slots   = appointment.get("alternatives_multiple") or []
    message = appointment.get("alternatives_message", "")
    advisor = appointment.get("advisor_name", "votre conseiller")

    slots_rows = ""
    labels = ["Option A", "Option B", "Option C"]
    for i, s in enumerate(slots):
        label     = labels[i] if i < len(labels) else f"Option {i+1}"
        date_str  = s.get("date_str") or str(s.get("date", ""))[:10]
        start     = s.get("start_time", "")
        end       = s.get("end_time", "")
        slots_rows += f"""
        <tr>
          <td style="padding:10px 14px;font-size:13px;color:#92400E;font-weight:700;
                     border-bottom:1px solid #FDE68A;width:90px;">{label}</td>
          <td style="padding:10px 14px;font-size:13px;color:#78350F;
                     border-bottom:1px solid #FDE68A;">{date_str}</td>
          <td style="padding:10px 14px;font-size:13px;color:#78350F;font-weight:600;
                     border-bottom:1px solid #FDE68A;">{start} – {end}</td>
        </tr>"""

    msg_block = ""
    if message:
        msg_block = f"""
        <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;
                    padding:12px 16px;margin:0 0 20px;">
          <p style="font-size:13px;color:#92400E;margin:0;font-style:italic;">"{message}"</p>
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#92400E 0%,#D97706 100%);
                     border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:12px;">
              <svg width="44" height="34" viewBox="0 0 48 38" fill="none">
                <path d="M4 6 C4 6,8 32,13 32 C18 32,18 10,24 10 C30 10,30 32,35 32 C40 32,44 6,44 6"
                  stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <div style="text-align:left;">
                <div style="font-size:20px;font-weight:700;color:white;">Attijari<span style="font-weight:300;">bank</span></div>
                <div style="font-size:9px;color:rgba(255,255,255,0.7);font-style:italic;letter-spacing:0.06em;">Croire en vous</div>
              </div>
            </div>
            <div style="margin-top:16px;display:inline-flex;align-items:center;
                        background:rgba(255,255,255,0.15);border-radius:20px;padding:6px 16px;">
              <span style="font-size:13px;color:white;font-weight:600;">🔄 NOUVEAUX CRÉNEAUX PROPOSÉS</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:36px 40px 28px;
                     border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
            <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6;">
              {advisor} vous propose <strong>{len(slots)} créneaux</strong> pour reprogrammer
              votre rendez-vous. Connectez-vous à votre espace pour choisir celui qui vous convient.
            </p>
            {msg_block}
            <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;
                        overflow:hidden;margin:0 0 24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr style="background:#FDE68A;">
                  <th style="padding:10px 14px;font-size:11px;color:#92400E;text-align:left;
                             text-transform:uppercase;letter-spacing:0.08em;width:90px;">Option</th>
                  <th style="padding:10px 14px;font-size:11px;color:#92400E;text-align:left;
                             text-transform:uppercase;letter-spacing:0.08em;">Date</th>
                  <th style="padding:10px 14px;font-size:11px;color:#92400E;text-align:left;
                             text-transform:uppercase;letter-spacing:0.08em;">Heure</th>
                </tr>
                {slots_rows}
              </table>
            </div>
            <div style="text-align:center;margin:0 0 20px;">
              <p style="font-size:13px;color:#475569;margin:0;line-height:1.6;">
                Rendez-vous dans la section <strong>Mes rendez-vous</strong><br>
                pour sélectionner votre créneau préféré.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;
                     border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
            <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
              Attijari Bank Tunisie — Service clientèle<br>
              Cet email est généré automatiquement. Ne pas répondre.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return send_email(to=to_email, subject="🔄 Nouveaux créneaux disponibles — Attijari Bank", html_body=html)


def send_appointment_cancelled_by_advisor(to_email: str, user_name: str, appointment: dict) -> bool:
    """Email envoyé au client quand le conseiller annule un RDV déjà confirmé."""
    date_str   = appointment.get("date", "")
    start_time = appointment.get("start_time", "")
    motif      = appointment.get("motif_label", "")
    reason     = appointment.get("cancellation_reason", "")
    advisor    = appointment.get("cancelled_by_name", "votre conseiller")

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#92400E 0%,#D97706 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:12px;">
              <svg width="44" height="34" viewBox="0 0 48 38" fill="none">
                <path d="M4 6 C4 6,8 32,13 32 C18 32,18 10,24 10 C30 10,30 32,35 32 C40 32,44 6,44 6" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>
              <div style="text-align:left;">
                <div style="font-size:20px;font-weight:700;color:white;">Attijari<span style="font-weight:300;">bank</span></div>
                <div style="font-size:9px;color:rgba(255,255,255,0.7);font-style:italic;letter-spacing:0.06em;">Croire en vous</div>
              </div>
            </div>
            <div style="margin-top:16px;display:inline-flex;align-items:center;background:rgba(255,255,255,0.15);border-radius:20px;padding:6px 16px;">
              <span style="font-size:13px;color:white;font-weight:600;letter-spacing:0.04em;">⚠️ RENDEZ-VOUS ANNULÉ</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:36px 40px 28px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
            <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;font-weight:600;">Bonjour {user_name},</p>
            <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.6;">
              Votre rendez-vous du <strong>{date_str} à {start_time}</strong> ({motif}) a été annulé par {advisor} suite à un imprévu.
            </p>
            <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
              <p style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Motif de l'annulation</p>
              <p style="font-size:13px;color:#78350F;margin:0;line-height:1.6;">{reason or "Imprévu de dernière minute."}</p>
            </div>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px;">
              <p style="font-size:13px;color:#166534;margin:0;font-weight:600;">Que faire ?</p>
              <p style="font-size:12px;color:#166534;margin:6px 0 0;line-height:1.6;">
                Votre créneau a été libéré. Vous pouvez soumettre une nouvelle demande depuis la section <strong>Prendre un RDV</strong> sur votre espace client.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;">
            <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.6;">
              Attijari Bank Tunisie — Service clientèle<br>
              Pour toute question : <strong>71 141 141</strong>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return send_email(to=to_email, subject="⚠️ Rendez-vous annulé — Attijari Bank", html_body=html)


def send_2fa_code(to: str, user_name: str, code: str) -> bool:
    """
    Envoie le code 2FA par email.
    Le code est passe en parametre — cette fonction ne le genere pas.
    Ne logue JAMAIS le code en clair.
    """
    html = _build_2fa_html(user_name, code, TWO_FA_EXPIRY)
    return send_email(
        to=to,
        subject="[Attijari Bank] Votre code de verification",
        html_body=html,
    )
