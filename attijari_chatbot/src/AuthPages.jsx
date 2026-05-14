import { useState } from "react";

const API_URL = "";

const C = {
  red: "#CC0000", redDark: "#A00000",
  white: "#FFFFFF", offWhite: "#F8F7F5",
  charcoal: "#1A1A1A", midGray: "#757575",
  lightGray: "#E8E4DF", borderGray: "#D8D4CE",
  gold: "#B8964A", blue: "#2563EB",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`;

// ── 2 segments disponibles ──
const SEGMENTS = [
  {
    id: "particulier",
    label: "Particulier",
    icon: "👤",
    desc: "Comptes, cartes, crédits et épargne pour particuliers",
    color: C.red,
    features: ["Compte courant", "Cartes bancaires", "Crédits immobiliers & auto", "Épargne & placement"],
  },
  {
    id: "professionnel",
    label: "Professionnel libéral",
    icon: "💼",
    desc: "Solutions bancaires dédiées aux professions libérales",
    color: C.blue,
    features: ["Compte professionnel", "Carte business", "Crédit professionnel", "Assurance & placement"],
  },
];

// ── Logo ──
const AttijariLogo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 28 }}>
    <svg width="48" height="38" viewBox="0 0 48 38" fill="none">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="40%" stopColor="#E8521A" />
          <stop offset="100%" stopColor="#CC0000" />
        </linearGradient>
      </defs>
      <path d="M4 6 C4 6, 8 32, 13 32 C18 32, 18 10, 24 10 C30 10, 30 32, 35 32 C40 32, 44 6, 44 6"
        stroke="url(#logoGrad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: C.charcoal, fontFamily: "'Source Sans 3', sans-serif" }}>Attijari</span>
        <span style={{ fontSize: 22, fontWeight: 300, color: C.charcoal, fontFamily: "'Source Sans 3', sans-serif" }}>bank</span>
      </div>
      <div style={{ fontSize: 10, color: C.midGray, fontStyle: "italic", letterSpacing: "0.04em" }}>Croire en vous</div>
    </div>
  </div>
);

// ── Input Field ──
const InputField = ({ label, type, value, onChange, placeholder, autoComplete }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.midGray, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Source Sans 3', sans-serif" }}>
        {label}
      </label>
      <input type={type} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete={autoComplete || "off"}
        style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${focused ? C.red : C.borderGray}`, borderRadius: 10, fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", background: C.white, color: C.charcoal, outline: "none", transition: "all 0.2s", boxSizing: "border-box", boxShadow: focused ? `0 0 0 3px ${C.red}15` : "none" }}
      />
    </div>
  );
};

// ── Sélecteur de segment — 2 grandes cartes ──
const SegmentSelector = ({ value, onChange }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.midGray, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Source Sans 3', sans-serif" }}>
      Votre profil *
    </label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {SEGMENTS.map(seg => (
        <div key={seg.id} onClick={() => onChange(seg.id)}
          style={{ border: `2px solid ${value === seg.id ? seg.color : C.borderGray}`, borderRadius: 14, padding: "16px 14px", cursor: "pointer", background: value === seg.id ? `${seg.color}08` : C.white, transition: "all 0.2s", boxShadow: value === seg.id ? `0 0 0 3px ${seg.color}20` : "0 2px 6px rgba(0,0,0,0.05)", position: "relative" }}>

          {/* Checkmark */}
          {value === seg.id && (
            <div style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: seg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.white, fontWeight: 700 }}>✓</div>
          )}

          {/* Icône + label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{seg.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: value === seg.id ? seg.color : C.charcoal, fontFamily: "'Source Sans 3', sans-serif" }}>
              {seg.label}
            </span>
          </div>

          {/* Description */}
          <div style={{ fontSize: 11, color: C.midGray, lineHeight: 1.5, marginBottom: 10, fontFamily: "'Source Sans 3', sans-serif" }}>
            {seg.desc}
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {seg.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: value === seg.id ? seg.color : C.midGray, fontFamily: "'Source Sans 3', sans-serif" }}>
                <span style={{ fontSize: 8, opacity: 0.7 }}>●</span> {f}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    {!value && (
      <p style={{ fontSize: 12, color: C.midGray, marginTop: 8, fontFamily: "'Source Sans 3', sans-serif", textAlign: "center" }}>
        Choisissez votre profil pour des réponses personnalisées 💡
      </p>
    )}
  </div>
);

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
export function LoginPage({ onLogin, onGoRegister }) {
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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur connexion");
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
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
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", password: "", confirmPassword: "", segment: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.password) { setError("Veuillez remplir tous les champs obligatoires"); return; }
    if (!form.segment) { setError("Veuillez choisir votre profil (Particulier ou Professionnel)"); return; }
    if (form.password !== form.confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }
    if (form.password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }
    if (!/[A-Z]/.test(form.password)) { setError("Le mot de passe doit contenir au moins une majuscule"); return; }
    if (!/[a-z]/.test(form.password)) { setError("Le mot de passe doit contenir au moins une minuscule"); return; }
    if (!/[0-9]/.test(form.password)) { setError("Le mot de passe doit contenir au moins un chiffre"); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          telephone: form.telephone,
          password: form.password,
          confirm_password: form.confirmPassword,
          segment: form.segment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        if (Array.isArray(detail)) throw new Error(detail.map(d => d.msg).join(". "));
        throw new Error(detail || "Erreur inscription");
      }
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify({ ...data.user, segment: form.segment }));
      onLogin({ ...data.user, segment: form.segment }, data.access_token);
    } catch (err) {
      if (err.message === "Failed to fetch") setError("Impossible de joindre le serveur. Vérifiez que le backend est démarré.");
      else setError(err.message);
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.offWhite, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Source Sans 3', sans-serif", padding: "20px 0" }}>
      <style>{`${FONT_IMPORT} * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ background: C.white, borderRadius: 20, padding: "36px 40px", width: "100%", maxWidth: 520, boxShadow: "0 8px 40px rgba(0,0,0,0.1)", border: `1px solid ${C.lightGray}` }}>
        <AttijariLogo />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.charcoal, marginBottom: 4, textAlign: "center" }}>Créer un compte</h2>
        <p style={{ fontSize: 14, color: C.midGray, textAlign: "center", marginBottom: 24 }}>Rejoignez l'assistant bancaire Attijari</p>

        {/* Infos personnelles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InputField label="Nom *" type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ben Ali" autoComplete="family-name" />
          <InputField label="Prénom *" type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Mohamed" autoComplete="given-name" />
        </div>
        <InputField label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="votre@email.com" autoComplete="email" />
        <InputField label="Téléphone" type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} placeholder="+216 XX XXX XXX" autoComplete="tel" />

        {/* ✅ Sélecteur segment — 2 cartes */}
        <SegmentSelector value={form.segment} onChange={val => setForm({ ...form, segment: val })} />

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