// attijari_chatbot/src/pages/ReportNotMe.jsx
// Page publique — accessible sans JWT, via le lien reçu dans l'email d'alerte
import { useState, useEffect } from "react";

const C = {
  bg: "#F8F7F5", white: "#FFFFFF", red: "#CC0000",
  green: "#059669", orange: "#D97706",
  charcoal: "#1A1A1A", gray: "#6B7280", lightGray: "#E5E7EB",
  border: "#D8D4CE",
};

const AttijariLogo = () => (
  <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
    <img src="/attijari-logo.png" alt="Attijari Bank" style={{ height: 46, display: "block" }} />
  </div>
);

export default function ReportNotMe({ onGoLogin }) {
  const [status, setStatus]   = useState("loading"); // loading | success | error | invalid | already_used
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");

    if (!token) {
      setStatus("invalid");
      setMessage("Aucun token trouvé dans l'URL. Utilisez le lien reçu dans votre email d'alerte.");
      return;
    }

    fetch("/auth/report-not-me", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token }),
    })
      .then(async r => {
        const data = await r.json();
        if (r.ok) {
          setStatus("success");
          setMessage(data.message || "Votre compte a été sécurisé avec succès.");
        } else if (r.status === 400) {
          const isAlreadyUsed = r.headers.get("x-error-code") === "TOKEN_ALREADY_USED"
            || (data.detail && data.detail.includes("deja ete utilise"));
          if (isAlreadyUsed) {
            setStatus("already_used");
            setMessage(data.detail || "Ce lien a déjà été utilisé. Votre compte a déjà été sécurisé.");
          } else {
            setStatus("invalid");
            setMessage(data.detail || "Le lien est invalide ou a expiré (valable 48h).");
          }
        } else {
          setStatus("error");
          setMessage(data.detail || "Une erreur est survenue. Contactez le service client.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Impossible de contacter le serveur. Vérifiez votre connexion.");
      });
  }, []);

  const isLoading     = status === "loading";
  const isSuccess     = status === "success";
  const isAlreadyUsed = status === "already_used";

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Source Sans 3', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "0 16px",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <header style={{
        width: "100%", background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: "18px 28px",
        display: "flex", alignItems: "center",
      }}>
        <AttijariLogo/>
      </header>

      {/* Card */}
      <div style={{
        marginTop: 60, width: "100%", maxWidth: 500,
        background: C.white, borderRadius: 20,
        boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}>

        {/* Card header coloré selon le statut */}
        <div style={{
          padding: "28px 32px",
          background: isLoading ? "#F3F4F6"
            : isSuccess     ? "linear-gradient(135deg,#064E3B,#059669)"
            : isAlreadyUsed ? "linear-gradient(135deg,#1E3A5F,#2563EB)"
            : status === "invalid" ? "linear-gradient(135deg,#92400E,#D97706)"
            : "linear-gradient(135deg,#7F1D1D,#CC0000)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>
            {isLoading ? "⏳" : isSuccess ? "✅" : isAlreadyUsed ? "🔒" : status === "invalid" ? "⚠️" : "❌"}
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: isLoading ? C.gray : C.white,
          }}>
            {isLoading ? "Traitement en cours…"
              : isSuccess     ? "Compte sécurisé"
              : isAlreadyUsed ? "Lien déjà utilisé"
              : status === "invalid" ? "Lien invalide ou expiré"
              : "Erreur"}
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: "32px" }}>

          {isLoading && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 40, height: 40, margin: "0 auto 20px",
                border: `3px solid ${C.lightGray}`,
                borderTopColor: C.red,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}/>
              <p style={{ fontSize: 14, color: C.gray }}>
                Vérification du lien de sécurité et sécurisation de votre compte…
              </p>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {isSuccess && (
            <div>
              <p style={{ fontSize: 15, color: C.charcoal, lineHeight: 1.7, marginBottom: 24 }}>
                {message}
              </p>

              {/* Actions effectuées */}
              <div style={{
                background: "#ECFDF5", border: "1px solid #A7F3D0",
                borderRadius: 12, padding: "18px 20px", marginBottom: 24,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                  Actions effectuées
                </div>
                {[
                  "✅ Toutes vos sessions actives ont été bloquées",
                  "✅ L'appareil suspect a été révoqué",
                  "✅ Un email de confirmation vous a été envoyé",
                  "✅ Un incident de sécurité a été enregistré",
                ].map((a, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#065F46", padding: "4px 0", lineHeight: 1.5 }}>{a}</div>
                ))}
              </div>

              {/* Prochaines étapes */}
              <div style={{
                background: "#FEF3C7", border: "1px solid #FDE68A",
                borderRadius: 12, padding: "16px 20px", marginBottom: 28,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>
                  Prochaines étapes requises
                </div>
                {[
                  "Reconnectez-vous et changez votre mot de passe",
                  "Vérifiez vos transactions récentes",
                  "Contactez le 71 141 141 si vous avez des doutes",
                ].map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#92400E", padding: "3px 0" }}>
                    {i + 1}. {s}
                  </div>
                ))}
              </div>

              <button
                onClick={onGoLogin}
                style={{
                  width: "100%", padding: "13px",
                  background: "linear-gradient(135deg,#E8521A,#CC0000)",
                  border: "none", borderRadius: 10,
                  color: C.white, fontSize: 15, fontWeight: 700,
                  cursor: "pointer",
                }}>
                Se reconnecter avec un nouveau mot de passe
              </button>
            </div>
          )}

          {isAlreadyUsed && (
            <div>
              <p style={{ fontSize: 15, color: C.charcoal, lineHeight: 1.7, marginBottom: 24 }}>
                {message}
              </p>
              <div style={{
                background: "#EFF6FF", border: "1px solid #BFDBFE",
                borderRadius: 12, padding: "16px 20px", marginBottom: 28,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF", marginBottom: 8 }}>
                  Information
                </div>
                <div style={{ fontSize: 12, color: "#1E40AF", lineHeight: 2 }}>
                  • Ce lien de signalement est à <strong>usage unique</strong><br/>
                  • Votre compte a déjà été protégé lors du premier clic<br/>
                  • Reconnectez-vous et changez votre mot de passe si ce n'est pas fait
                </div>
              </div>
              <button
                onClick={onGoLogin}
                style={{
                  width: "100%", padding: "13px",
                  background: "linear-gradient(135deg,#1E3A5F,#2563EB)",
                  border: "none", borderRadius: 10,
                  color: C.white, fontSize: 15, fontWeight: 700,
                  cursor: "pointer",
                }}>
                Se reconnecter
              </button>
            </div>
          )}

          {(status === "invalid" || status === "error") && (
            <div>
              <p style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.7, marginBottom: 24 }}>
                {message}
              </p>

              <div style={{
                background: "#FFF7ED", border: "1px solid #FED7AA",
                borderRadius: 12, padding: "16px 20px", marginBottom: 28,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>
                  Que faire ?
                </div>
                <div style={{ fontSize: 12, color: "#92400E", lineHeight: 2 }}>
                  • Vérifiez que le lien est complet (non tronqué)<br/>
                  • Le lien est valable <strong>48 heures</strong> après réception<br/>
                  • Contactez le service client : <strong>71 141 141</strong>
                </div>
              </div>

              <button
                onClick={onGoLogin}
                style={{
                  width: "100%", padding: "13px",
                  background: C.white, border: `2px solid ${C.red}`,
                  borderRadius: 10, color: C.red,
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>
                Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 32, fontSize: 11, color: C.gray, textAlign: "center" }}>
        Attijari Bank Tunisie — Sécurité des comptes<br/>
        Si vous avez des questions : <strong>71 141 141</strong>
      </p>
    </div>
  );
}
