import { useState } from "react";

const API_URL = "";

const C = {
  red: "#CC0000", redDark: "#A00000",
  white: "#FFFFFF", offWhite: "#F8F7F5",
  charcoal: "#1A1A1A", midGray: "#757575",
  lightGray: "#E8E4DF", borderGray: "#D8D4CE",
  gold: "#B8964A", blue: "#2563EB",
  green: "#16A34A",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`;

// ── Logo ──
const AttijariLogo = () => (
  <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
    <img src="/attijari-logo.png" alt="Attijari Bank" style={{ height: 52, display: "block" }} />
  </div>
);

// ── Input Field générique ──
const InputField = ({ label, type, value, onChange, placeholder, autoComplete, error }) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? C.red : focused ? C.red : C.borderGray;
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.midGray, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Source Sans 3', sans-serif" }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete={autoComplete || "off"}
        style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${borderColor}`, borderRadius: 10, fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", background: C.white, color: C.charcoal, outline: "none", transition: "all 0.2s", boxSizing: "border-box", boxShadow: focused ? `0 0 0 3px ${C.red}15` : "none" }}
      />
      {error && (
        <p style={{ fontSize: 12, color: C.red, marginTop: 5, fontFamily: "'Source Sans 3', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
};

// ── Champ Code Client avec badge et aide ──
const ClientCodeField = ({ value, onChange, error }) => {
  const [focused, setFocused] = useState(false);
  const isValidFormat = /^ATB-\d{4}-\d{4}$/i.test(value.trim());
  const showCheck = value.length > 0 && isValidFormat && !error;
  const borderColor = error ? C.red : showCheck ? C.green : focused ? C.red : C.borderGray;

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.midGray, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Source Sans 3', sans-serif" }}>
        Code client *
      </label>

      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="ATB-2026-XXXX"
          autoComplete="off"
          style={{ width: "100%", padding: "11px 40px 11px 14px", border: `1.5px solid ${borderColor}`, borderRadius: 10, fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", background: C.white, color: C.charcoal, outline: "none", transition: "all 0.2s", boxSizing: "border-box", boxShadow: focused ? `0 0 0 3px ${C.red}15` : "none", textTransform: "uppercase", letterSpacing: "0.04em" }}
        />
        {showCheck && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.green, fontSize: 16, fontWeight: 700 }}>✓</span>
        )}
      </div>

      {error ? (
        <p style={{ fontSize: 12, color: C.red, marginTop: 5, fontFamily: "'Source Sans 3', sans-serif" }}>{error}</p>
      ) : (
        <p style={{ fontSize: 11, color: C.midGray, marginTop: 5, fontFamily: "'Source Sans 3', sans-serif" }}>
          Code fourni par votre conseiller Attijari Bank
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
export function LoginPage({ onLogin, onGoRegister, onGoVerify2FA }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Veuillez remplir tous les champs"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur connexion");

      if (data.requires_2fa) {
        sessionStorage.setItem("twofa_session_id", data.session_id);
        onGoVerify2FA({
          sessionId:   data.session_id,
          emailMasked: data.email_masked,
          expiresIn:   data.expires_in,
        });
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.client) localStorage.setItem("client", JSON.stringify(data.client));
      onLogin(data.user, data.access_token);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Source Sans 3', sans-serif", padding: 20 }}>
      <style>{`${FONT_IMPORT} * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ background: C.white, borderRadius: 20, padding: "40px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.1)", border: `1px solid ${C.lightGray}` }}>
        <AttijariLogo />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.charcoal, marginBottom: 6, textAlign: "center" }}>Bienvenue</h2>
        <p style={{ fontSize: 14, color: C.midGray, textAlign: "center", marginBottom: 28 }}>Connectez-vous à votre espace personnel</p>

        <InputField label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="votre@email.com" autoComplete="email" />
        <InputField label="Mot de passe" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="current-password" />

        {error && <div style={{ background: "#FFF0F0", border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {error}</div>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "14px", background: loading ? C.lightGray : `linear-gradient(135deg, #E8521A, ${C.red})`, border: "none", borderRadius: 10, color: C.white, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Source Sans 3', sans-serif", transition: "all 0.2s", boxShadow: loading ? "none" : `0 4px 16px ${C.red}40` }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 13, color: C.midGray }}>Pas encore de compte ? </span>
          <button onClick={onGoRegister} style={{ background: "none", border: "none", color: C.red, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif" }}>S'inscrire</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REGISTER PAGE
// ─────────────────────────────────────────────
export function RegisterPage({ onLogin, onGoLogin }) {
  const [form, setForm] = useState({ client_code: "", email: "", telephone: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientCodeError, setClientCodeError] = useState("");
  const [accountExistsError, setAccountExistsError] = useState(false);

  const CLIENT_CODE_RE = /^ATB-\d{4}-\d{4}$/i;

  const handleSubmit = async () => {
    setError("");
    setClientCodeError("");
    setAccountExistsError(false);

    // Validation locale
    const code = form.client_code.trim().toUpperCase();
    if (!code) { setClientCodeError("Le code client est requis"); return; }
    if (!CLIENT_CODE_RE.test(code)) { setClientCodeError("Format attendu: ATB-YYYY-XXXX (ex: ATB-2026-0001)"); return; }
    if (!form.email) { setError("L'email est requis"); return; }
    if (!form.password) { setError("Le mot de passe est requis"); return; }
    if (form.password !== form.confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }
    if (form.password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }
    if (!/[A-Z]/.test(form.password)) { setError("Le mot de passe doit contenir au moins une majuscule"); return; }
    if (!/[a-z]/.test(form.password)) { setError("Le mot de passe doit contenir au moins une minuscule"); return; }
    if (!/[0-9]/.test(form.password)) { setError("Le mot de passe doit contenir au moins un chiffre"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_code:      code,
          email:            form.email,
          telephone:        form.telephone || undefined,
          password:         form.password,
          confirm_password: form.confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map(d => d.msg).join(". ")
          : (data.detail || "Erreur inscription");

        if (detail.includes("introuvable") || detail.includes("invalide")) {
          setClientCodeError(detail);
        } else if (detail.includes("existe") || detail.includes("deja")) {
          setAccountExistsError(true);
          setClientCodeError("Un compte est déjà associé à ce code client.");
        } else {
          setError(detail);
        }
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.client) localStorage.setItem("client", JSON.stringify(data.client));
      onLogin(data.user, data.access_token);

    } catch (err) {
      if (err.message === "Failed to fetch") setError("Impossible de joindre le serveur. Vérifiez que le backend est démarré.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Source Sans 3', sans-serif", padding: "20px 0" }}>
      <style>{`${FONT_IMPORT} * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ background: C.white, borderRadius: 20, padding: "36px 40px", width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.1)", border: `1px solid ${C.lightGray}` }}>
        <AttijariLogo />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.charcoal, marginBottom: 4, textAlign: "center" }}>Créer un compte</h2>
        <p style={{ fontSize: 14, color: C.midGray, textAlign: "center", marginBottom: 24 }}>Rejoignez l'assistant bancaire Attijari</p>

        {/* Code client — en premier */}
        <ClientCodeField
          value={form.client_code}
          onChange={e => { setForm({ ...form, client_code: e.target.value }); setClientCodeError(""); setAccountExistsError(false); }}
          error={clientCodeError}
        />

        {/* Lien vers login si compte existe déjà */}
        {accountExistsError && (
          <div style={{ background: "#FFF7ED", border: "1px solid #F59E0B30", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400E", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Ce code est déjà associé à un compte.</span>
            <button onClick={onGoLogin} style={{ background: "none", border: "none", color: C.red, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif", textDecoration: "underline" }}>
              Se connecter
            </button>
          </div>
        )}

        <InputField label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="votre@email.com" autoComplete="email" />
        <InputField label="Téléphone" type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="+216 XX XXX XXX" autoComplete="tel" />
        <InputField label="Mot de passe *" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="8+ car. avec majuscule et chiffre" autoComplete="new-password" />
        <InputField label="Confirmer mot de passe *" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Répétez le mot de passe" autoComplete="new-password" />

        {error && <div style={{ background: "#FFF0F0", border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.red, marginBottom: 16 }}>⚠️ {error}</div>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "14px", background: loading ? C.lightGray : `linear-gradient(135deg, #E8521A, ${C.red})`, border: "none", borderRadius: 10, color: C.white, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Source Sans 3', sans-serif", transition: "all 0.2s", boxShadow: loading ? "none" : `0 4px 16px ${C.red}40` }}>
          {loading ? "Inscription..." : "Créer mon compte"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 13, color: C.midGray }}>Déjà un compte ? </span>
          <button onClick={onGoLogin} style={{ background: "none", border: "none", color: C.red, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif" }}>Se connecter</button>
        </div>
      </div>
    </div>
  );
}
