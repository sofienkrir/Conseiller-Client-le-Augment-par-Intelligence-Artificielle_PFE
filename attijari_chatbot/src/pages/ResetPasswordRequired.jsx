// attijari_chatbot/src/pages/ResetPasswordRequired.jsx
import { useState } from "react";

const C = {
  red: "#CC0000", redDark: "#A00000",
  white: "#FFFFFF", offWhite: "#F8F7F5",
  charcoal: "#1A1A1A", midGray: "#757575",
  lightGray: "#E8E4DF", borderGray: "#D8D4CE",
  green: "#059669",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`;

const AttijariLogo = () => (
  <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
    <img src="/attijari-logo.png" alt="Attijari Bank" style={{ height: 52, display: "block" }} />
  </div>
);

export default function ResetPasswordRequired({ resetToken, onLogin, onBack }) {
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Faible", "Moyen", "Bon", "Fort"][strength];
  const strengthColor = ["", "#DC2626", "#D97706", "#2563EB", "#059669"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }

    setLoading(true);
    try {
      const res = await fetch("/auth/reset-password-after-incident", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reset_token: resetToken, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Erreur lors de la réinitialisation.");
        return;
      }
      setSuccess(true);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.client) localStorage.setItem("client", JSON.stringify(data.client));
      setTimeout(() => onLogin(data.user, data.access_token), 1500);
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Source Sans 3', sans-serif", padding: 20 }}>
      <style>{`${FONT_IMPORT} * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <div style={{ background: C.white, borderRadius: 20, padding: "40px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.1)", border: `1px solid ${C.lightGray}` }}>
        <AttijariLogo />

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #FFF7ED, #FFF1F2)", border: "2px solid #FED7AA", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={C.red} strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={C.red} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.charcoal, marginBottom: 8 }}>
            Nouveau mot de passe requis
          </h2>
          <p style={{ fontSize: 13, color: C.midGray, lineHeight: 1.6 }}>
            Suite à l'alerte de sécurité, vous devez définir<br />un nouveau mot de passe pour continuer.
          </p>
        </div>

        {/* Alerte incident */}
        <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 14px", marginBottom: 24, fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
          🔒 Votre compte a été sécurisé suite à un signalement. Toutes les sessions précédentes ont été révoquées.
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.green }}>Mot de passe mis à jour !</p>
            <p style={{ fontSize: 13, color: C.midGray, marginTop: 8 }}>Connexion en cours…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* New password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.charcoal, marginBottom: 6 }}>
                Nouveau mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Minimum 8 caractères"
                  style={{ width: "100%", padding: "11px 40px 11px 14px", border: `1.5px solid ${C.borderGray}`, borderRadius: 10, fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", outline: "none", color: C.charcoal, background: C.offWhite }}
                  required
                />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.midGray, fontSize: 16 }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 3 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor : C.lightGray, transition: "background 0.2s" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.charcoal, marginBottom: 6 }}>
                Confirmer le mot de passe
              </label>
              <input
                type={showPwd ? "text" : "password"}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                placeholder="Répétez le mot de passe"
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${confirm && confirm !== password ? C.red : C.borderGray}`, borderRadius: 10, fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", outline: "none", color: C.charcoal, background: C.offWhite }}
                required
              />
              {confirm && confirm !== password && (
                <p style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {error && (
              <div style={{ background: "#FFF0F0", border: `1px solid ${C.red}40`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading || !password || !confirm}
              style={{
                width: "100%", padding: "14px",
                background: loading || !password || !confirm ? C.lightGray : `linear-gradient(135deg, #E8521A, ${C.red})`,
                border: "none", borderRadius: 10,
                color: loading || !password || !confirm ? C.midGray : C.white,
                fontSize: 15, fontWeight: 600,
                cursor: loading || !password || !confirm ? "not-allowed" : "pointer",
                fontFamily: "'Source Sans 3', sans-serif",
                boxShadow: loading || !password || !confirm ? "none" : `0 4px 16px ${C.red}40`,
                marginBottom: 14,
              }}>
              {loading ? "Réinitialisation…" : "Enregistrer le nouveau mot de passe"}
            </button>

            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={onBack}
                style={{ background: "none", border: "none", color: C.midGray, fontSize: 13, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif" }}>
                ← Retour à la connexion
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
