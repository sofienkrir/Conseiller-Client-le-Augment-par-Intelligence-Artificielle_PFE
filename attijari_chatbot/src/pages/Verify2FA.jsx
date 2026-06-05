// attijari_chatbot/src/pages/Verify2FA.jsx
import { useState, useEffect, useRef } from "react";

const API_URL = "";

const C = {
  red: "#CC0000", redDark: "#A00000",
  white: "#FFFFFF", offWhite: "#F8F7F5",
  charcoal: "#1A1A1A", midGray: "#757575",
  lightGray: "#E8E4DF", borderGray: "#D8D4CE",
  green: "#16A34A",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`;

const AttijariLogo = () => (
  <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
    <img src="/attijari-logo.png" alt="Attijari Bank" style={{ height: 52, display: "block" }} />
  </div>
);

export default function Verify2FA({ sessionId, emailMasked, expiresIn, onLogin, onRequirePasswordReset, onBack }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiresIn || 600);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  const handleDigitChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (value && next.every(d => d !== "")) handleVerify(next.join(""));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code) => {
    const finalCode = code || digits.join("");
    if (finalCode.length < 6) { setError("Entrez les 6 chiffres du code"); return; }
    if (timeLeft <= 0) { setError("Le code a expiré. Renvoyez un nouveau code."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId, code: finalCode, remember_device: rememberDevice }),
      });
      const data = await res.json();
      if (!res.ok) {
        const left = res.headers.get("X-Attempts-Left");
        let msg = data.detail || "Code incorrect";
        if (left !== null) msg += ` (${left} tentative${left !== "1" ? "s" : ""} restante${left !== "1" ? "s" : ""})`;
        setError(msg);
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        return;
      }
      // Réinitialisation mot de passe requise après incident sécurité
      if (data.requires_password_reset) {
        sessionStorage.removeItem("twofa_session_id");
        onRequirePasswordReset?.({ resetToken: data.reset_token, userId: data.user_id });
        return;
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.client) localStorage.setItem("client", JSON.stringify(data.client));
      sessionStorage.removeItem("twofa_session_id");
      onLogin(data.user, data.access_token);
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(""); setResendSuccess(false);
    try {
      const res = await fetch(`${API_URL}/auth/resend-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Impossible de renvoyer le code."); return; }
      setTimeLeft(data.expires_in);
      setResendCooldown(60);
      setResendSuccess(true);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => { setResendSuccess(false); }, 4000);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    }
  };

  const allFilled = digits.every(d => d !== "");
  const btnDisabled = loading || !allFilled || timeLeft <= 0;

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Source Sans 3', sans-serif", padding: 20 }}>
      <style>{`${FONT_IMPORT} * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }`}</style>

      <div style={{ background: C.white, borderRadius: 20, padding: "40px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.1)", border: `1px solid ${C.lightGray}` }}>
        <AttijariLogo />

        {/* Shield icon + title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #FFF7ED, #FFF1F2)", border: "2px solid #FED7AA", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="9 12 11 14 15 10" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.charcoal, marginBottom: 8 }}>Vérification en 2 étapes</h2>
          <p style={{ fontSize: 14, color: C.midGray, lineHeight: 1.6 }}>
            Un code à 6 chiffres a été envoyé à<br />
            <strong style={{ color: C.charcoal }}>{emailMasked}</strong>
          </p>
        </div>

        {/* 6-digit inputs */}
        <div
          style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, animation: error ? "shake 0.35s ease" : "none" }}
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              autoFocus={i === 0}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 48, height: 58, textAlign: "center",
                fontSize: 26, fontWeight: 700,
                border: `2px solid ${error ? C.red : d ? C.red : C.borderGray}`,
                borderRadius: 12,
                background: d ? "#FFF1F2" : C.white,
                color: C.charcoal,
                outline: "none",
                transition: "border-color 0.15s, background 0.15s",
                fontFamily: "'Courier New', monospace",
                caretColor: C.red,
              }}
            />
          ))}
        </div>

        {/* Countdown */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          {timeLeft > 0 ? (
            <span style={{ fontSize: 13, color: timeLeft < 60 ? C.red : C.midGray }}>
              Code valide encore <strong style={{ fontFamily: "'Courier New', monospace" }}>{formatTime(timeLeft)}</strong>
            </span>
          ) : (
            <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>Le code a expiré</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#FFF0F0", border: `1px solid ${C.red}40`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Resend success */}
        {resendSuccess && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.green, marginBottom: 16 }}>
            ✓ Nouveau code envoyé à {emailMasked}
          </div>
        )}

        {/* Remember device */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 22, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={e => setRememberDevice(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: C.red, cursor: "pointer", flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.5 }}>
            Faire confiance à cet appareil pendant <strong>30 jours</strong>
            <br />
            <span style={{ fontSize: 11, color: C.midGray }}>Vous ne serez pas redemandé sur ce navigateur</span>
          </span>
        </label>

        {/* Verify button */}
        <button
          onClick={() => handleVerify()}
          disabled={btnDisabled}
          style={{
            width: "100%", padding: "14px",
            background: btnDisabled ? C.lightGray : `linear-gradient(135deg, #E8521A, ${C.red})`,
            border: "none", borderRadius: 10,
            color: btnDisabled ? C.midGray : C.white,
            fontSize: 15, fontWeight: 600,
            cursor: btnDisabled ? "not-allowed" : "pointer",
            fontFamily: "'Source Sans 3', sans-serif",
            transition: "all 0.2s",
            boxShadow: btnDisabled ? "none" : `0 4px 16px ${C.red}40`,
            marginBottom: 14,
          }}
        >
          {loading ? "Vérification en cours..." : "Confirmer le code"}
        </button>

        {/* Resend */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            style={{
              background: "none", border: "none",
              color: resendCooldown > 0 || loading ? C.midGray : C.red,
              fontSize: 13, fontWeight: 600,
              cursor: resendCooldown > 0 || loading ? "not-allowed" : "pointer",
              fontFamily: "'Source Sans 3', sans-serif",
            }}
          >
            {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer le code"}
          </button>
        </div>

        {/* Back */}
        <div style={{ textAlign: "center", borderTop: `1px solid ${C.lightGray}`, paddingTop: 16 }}>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: C.midGray, fontSize: 13, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif" }}
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
