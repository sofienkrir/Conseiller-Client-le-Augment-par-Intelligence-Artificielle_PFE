// attijari_chatbot/src/pages/AdminSessions.jsx
import { useState, useEffect, useCallback } from "react";

const API = "";

const C = {
  bg: "#0F0F1A", bgCard: "#16162A", bgHover: "#1E1E35",
  border: "#2A2A45", accent: "#E8521A", gold: "#B8964A",
  white: "#FFFFFF", textPrimary: "#FFFFFF",
  textSecondary: "#AAAAAA", textMuted: "#555577",
  green: "#4ADE80", blue: "#3B82F6", orange: "#F59E0B",
  red: "#EF4444", purple: "#8B5CF6",
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`;

/* ── Icons ── */
const IcoBack    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoX       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoShield  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoDevice  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoGlobe   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="2"/></svg>;
const IcoAlert   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoLock    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoUser    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>;

/* ── Risk levels config ── */
const RISK_MAP = {
  LOW:      { color: C.green,  label: "LOW",      icon: "✅" },
  MEDIUM:   { color: C.blue,   label: "MEDIUM",   icon: "ℹ️" },
  HIGH:     { color: C.orange, label: "HIGH",      icon: "⚠️" },
  CRITICAL: { color: C.red,    label: "CRITICAL", icon: "🚨" },
};

const FACTOR_LABELS = {
  new_device:      { icon: "🆕", label: "Nouv. device" },
  new_city:        { icon: "📍", label: "Nouv. ville" },
  new_country:     { icon: "🌍", label: "Nouv. pays" },
  unusual_hour:    { icon: "🌙", label: "Heure inhab." },
  failed_2fa:      { icon: "🔑", label: "2FA échoué" },
  geo_jump:        { icon: "✈️", label: "Saut géo" },
  shared_device:   { icon: "👥", label: "Partagé" },
  suspicious_ua:   { icon: "🤖", label: "Bot" },
  not_me_reported: { icon: "🚨", label: "Signalé" },
  admin_force_logout: { icon: "⚡", label: "Admin logout" },
};

/* ── Stat Card ── */
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, borderRadius: "0 0 0 60px", background: `${color}12`, pointerEvents: "none" }} />
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.white, lineHeight: 1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const map = {
    active:     { color: C.green,    label: "Actif"    },
    suspicious: { color: C.orange,   label: "Suspect"  },
    revoked:    { color: C.red,      label: "Révoqué"  },
    expired:    { color: C.textMuted, label: "Expiré"  },
  };
  const { color, label } = map[status] || { color: C.textMuted, label: status };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      background: `${color}20`, color, border: `1px solid ${color}50` }}>
      {label}
    </span>
  );
}

/* ── Risk Badge ── */
function RiskBadge({ level, score }) {
  const { color, label, icon } = RISK_MAP[level] || RISK_MAP.LOW;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
        background: `${color}20`, color, border: `1px solid ${color}50`, whiteSpace: "nowrap" }}>
        {icon} {label}
      </span>
      {score > 0 && (
        <span style={{ fontSize: 10, color: C.textMuted }}>score: {score}</span>
      )}
    </div>
  );
}

/* ── Factor Tags ── */
function FactorTags({ factors }) {
  if (!factors?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
      {factors.slice(0, 3).map(f => {
        const { icon, label } = FACTOR_LABELS[f.name] || { icon: "⚠️", label: f.name };
        return (
          <span key={f.name} title={f.details || label}
            style={{ fontSize: 9, padding: "1px 6px", borderRadius: 20, background: `${C.orange}15`,
              color: C.orange, border: `1px solid ${C.orange}30`, cursor: "default", whiteSpace: "nowrap" }}>
            {icon} {label}
          </span>
        );
      })}
    </div>
  );
}

/* ── Device Icon ── */
function DeviceIcon({ type }) {
  if (type === "Mobile") return <span title="Mobile"  style={{ fontSize: 16 }}>📱</span>;
  if (type === "Tablet") return <span title="Tablette" style={{ fontSize: 16 }}>📟</span>;
  return                        <span title="Desktop"  style={{ fontSize: 16 }}>🖥️</span>;
}

/* ── Time ago ── */
function timeAgo(isoStr) {
  if (!isoStr) return "—";
  const diff = (Date.now() - new Date(isoStr + "Z").getTime()) / 1000;
  if (diff < 60)    return "il y a quelques secondes";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/* ── Detail Modal ── */
function SessionDetailModal({ session, token, onClose, onRefresh }) {
  const [revoking,    setRevoking]    = useState(false);
  const [flagging,    setFlagging]    = useState(false);
  const [legitimating, setLegitimating] = useState(false);
  const [logoutting,  setLogoutting]  = useState(false);
  const [msg,         setMsg]         = useState("");

  const d   = session.device_info || {};
  const loc = session.location    || {};
  const rf  = session.risk_factors || [];

  const call = async (path, method = "PUT") => {
    const r = await fetch(`${API}/admin/sessions/${path}`, {
      method, headers: { Authorization: `Bearer ${token}` },
    });
    return { ok: r.ok, data: await r.json() };
  };

  const handleRevoke = async () => {
    if (!confirm(`Révoquer le device de ${session.user_email} ?`)) return;
    setRevoking(true); setMsg("");
    const { ok, data } = await call(`${session.id}/revoke`).catch(() => ({ ok: false, data: {} }));
    setMsg(ok
      ? "✓ Device révoqué" + (data.user_notified ? " · utilisateur notifié" : "")
      : "✗ " + (data.detail || "Erreur"));
    if (ok) onRefresh();
    setRevoking(false);
  };

  const handleFlag = async () => {
    setFlagging(true); setMsg("");
    const { ok, data } = await call(`${session.id}/flag-suspicious`).catch(() => ({ ok: false, data: {} }));
    setMsg(ok ? "⚠️ Marqué comme suspect" : "✗ " + (data.detail || "Erreur"));
    if (ok) onRefresh();
    setFlagging(false);
  };

  const handleLegitimate = async () => {
    setLegitimating(true); setMsg("");
    const { ok, data } = await call(`${session.id}/mark-legitimate`).catch(() => ({ ok: false, data: {} }));
    setMsg(ok ? "✅ Marqué comme légitime" : "✗ " + (data.detail || "Erreur"));
    if (ok) onRefresh();
    setLegitimating(false);
  };

  const handleForceLogout = async () => {
    if (!confirm(`Forcer la déconnexion complète de ${session.user_email} ? Toutes les sessions seront bloquées.`)) return;
    setLogoutting(true); setMsg("");
    const { ok, data } = await call(`${session.id}/force-logout`).catch(() => ({ ok: false, data: {} }));
    setMsg(ok ? "⚡ Déconnexion forcée — toutes les sessions bloquées" : "✗ " + (data.detail || "Erreur"));
    if (ok) onRefresh();
    setLogoutting(false);
  };

  const riskInfo = RISK_MAP[session.risk_level] || RISK_MAP.LOW;
  const riskScore = session.risk_score || 0;
  const barWidth = Math.min(100, riskScore);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: 540, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: 0 }}>Détails de la session</h3>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>{session.user_email}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 }}><IcoX/></button>
        </div>

        {/* Alerte "Ce n'était pas moi" */}
        {session.reported_not_me && (
          <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}40`, borderRadius: 10,
            padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>Signalé par l'utilisateur</div>
              <div style={{ fontSize: 11, color: `${C.red}CC` }}>L'utilisateur a cliqué "Ce n'était pas moi"</div>
            </div>
          </div>
        )}

        {/* Risque */}
        <Section title="Analyse de risque (RBA)">
          <tr>
            <td style={{ padding: "4px 0", fontSize: 12, color: C.textMuted, width: 140 }}>Niveau</td>
            <td style={{ padding: "4px 0" }}><RiskBadge level={session.risk_level} score={riskScore}/></td>
          </tr>
          <tr>
            <td style={{ padding: "4px 0", fontSize: 12, color: C.textMuted }}>Score</td>
            <td style={{ padding: "4px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: `${C.border}`, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${barWidth}%`, height: "100%", background: riskInfo.color, borderRadius: 3, transition: "width 0.6s" }}/>
                </div>
                <span style={{ fontSize: 12, color: riskInfo.color, fontWeight: 700, minWidth: 28 }}>{riskScore}</span>
              </div>
            </td>
          </tr>
          {rf.length > 0 && (
            <tr>
              <td style={{ padding: "8px 0 4px", fontSize: 12, color: C.textMuted, verticalAlign: "top" }}>Facteurs</td>
              <td style={{ padding: "8px 0 4px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {rf.map(f => {
                    const fl = FACTOR_LABELS[f.name] || { icon: "⚠️", label: f.name };
                    return (
                      <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11 }}>{fl.icon}</span>
                        <span style={{ fontSize: 11, color: C.textSecondary }}>{f.details || fl.label}</span>
                        <span style={{ fontSize: 10, color: C.orange, marginLeft: "auto" }}>+{f.points}pts</span>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          )}
        </Section>

        {/* Utilisateur */}
        <Section title="Utilisateur">
          <Row label="Email"  value={session.user_email || "—"} />
          <Row label="Nom"    value={`${session.user_prenom || ""} ${session.user_nom || ""}`.trim() || "—"} />
          <Row label="Statut" value={<StatusBadge status={session.status}/>} />
          <Row label="Bloqué" value={session.is_blocked ? <span style={{ color: C.red }}>Oui</span> : "Non"} />
        </Section>

        {/* Device */}
        <Section title="Appareil">
          <Row label="Type"    value={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><DeviceIcon type={d.device_type}/>{d.device_type || "—"}</span>} />
          <Row label="Browser" value={`${d.browser || "—"} ${d.browser_version || ""}`.trim()} />
          <Row label="OS"      value={`${d.os || "—"} ${d.os_version || ""}`.trim()} />
          <Row label="Bot"     value={d.is_bot ? "Oui ⚠️" : "Non"} />
        </Section>

        {/* Réseau */}
        <Section title="Réseau & Localisation">
          <Row label="IP"     value={session.ip_address || "—"} />
          <Row label="Pays"   value={loc.country || "—"} />
          <Row label="Ville"  value={loc.city || "—"} />
          <Row label="Fuseau" value={loc.timezone || "—"} />
        </Section>

        {/* Activité */}
        <Section title="Activité">
          <Row label="Première connexion" value={fmtDate(session.first_seen_at)} />
          <Row label="Dernière activité"  value={fmtDate(session.last_seen_at)} />
          <Row label="Nombre de logins"   value={session.login_count ?? "—"} />
          <Row label="Alerte envoyée"     value={session.is_alerted ? "Oui" : "Non"} />
        </Section>

        {msg && (
          <div style={{ background: msg.startsWith("✓") || msg.startsWith("✅") || msg.startsWith("⚡") ? `${C.green}15`
              : msg.startsWith("⚠") ? `${C.orange}15` : `${C.red}15`,
            border: `1px solid ${msg.startsWith("✓") || msg.startsWith("✅") || msg.startsWith("⚡") ? C.green : msg.startsWith("⚠") ? C.orange : C.red}40`,
            borderRadius: 8, padding: "9px 14px", fontSize: 12,
            color: msg.startsWith("✓") || msg.startsWith("✅") || msg.startsWith("⚡") ? C.green : msg.startsWith("⚠") ? C.orange : C.red,
            marginBottom: 14 }}>
            {msg}
          </div>
        )}

        {/* Actions */}
        {session.status !== "revoked" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {session.status === "suspicious" && (
              <button onClick={handleLegitimate} disabled={legitimating}
                style={{ flex: 1, minWidth: 130, padding: "10px", background: `${C.green}15`, border: `1px solid ${C.green}40`,
                  borderRadius: 10, color: C.green, cursor: legitimating ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
                {legitimating ? "..." : "✅ Marquer légitime"}
              </button>
            )}
            {session.status !== "suspicious" && (
              <button onClick={handleFlag} disabled={flagging}
                style={{ flex: 1, minWidth: 130, padding: "10px", background: `${C.orange}15`, border: `1px solid ${C.orange}40`,
                  borderRadius: 10, color: C.orange, cursor: flagging ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
                {flagging ? "..." : "⚠️ Marquer suspect"}
              </button>
            )}
            <button onClick={handleForceLogout} disabled={logoutting}
              style={{ flex: 1, minWidth: 130, padding: "10px", background: `${C.purple}15`, border: `1px solid ${C.purple}40`,
                borderRadius: 10, color: C.purple, cursor: logoutting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
              {logoutting ? "..." : "⚡ Forcer déconnexion"}
            </button>
            <button onClick={handleRevoke} disabled={revoking}
              style={{ flex: 1, minWidth: 130, padding: "10px", background: `${C.red}15`, border: `1px solid ${C.red}40`,
                borderRadius: 10, color: "#ff8080", cursor: revoking ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
              {revoking ? "..." : "🔒 Révoquer device"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
        letterSpacing: "0.1em", marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid ${C.border}` }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td style={{ padding: "4px 0", fontSize: 12, color: C.textMuted, width: 140 }}>{label}</td>
      <td style={{ padding: "4px 0", fontSize: 12, color: C.white, fontWeight: 500 }}>{value}</td>
    </tr>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════════════════ */
export default function AdminSessions({ token, onBack }) {
  const [sessions,    setSessions]   = useState([]);
  const [stats,       setStats]      = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [days,        setDays]       = useState(7);
  const [statusFilter, setStatus]    = useState("all");
  const [riskFilter,  setRiskFilter] = useState("all");
  const [search,      setSearch]     = useState("");
  const [detail,      setDetail]     = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days, status: statusFilter });
      if (search.trim()) params.set("user_email", search.trim());

      const [sRes, stRes] = await Promise.all([
        fetch(`${API}/admin/sessions?${params}`, { headers }),
        fetch(`${API}/admin/sessions/stats?days=${days}`, { headers }),
      ]);
      if (sRes.ok)  setSessions((await sRes.json()).sessions || []);
      if (stRes.ok) setStats(await stRes.json());
    } catch {}
    finally { setLoading(false); }
  }, [days, statusFilter, search, token]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setDetail(null); load(); };

  // Client-side risk filter
  const displayed = riskFilter === "all"
    ? sessions
    : sessions.filter(s => (s.risk_level || "LOW") === riskFilter);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Source Sans 3', sans-serif", color: C.white }}>
      <style>{`
        ${FONT}
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
      `}</style>

      {/* Header */}
      <header style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 62,
        display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}35`,
              borderRadius: 8, padding: "6px 12px", color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5 }}>
              <IcoBack/> Retour Admin
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.blue }}><IcoGlobe/></span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Sessions & Devices</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${C.accent}14`,
          border: `1px solid ${C.accent}30`, borderRadius: 20, padding: "5px 12px" }}>
          <span style={{ color: C.accent }}><IcoShield/></span>
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>Monitoring Sécurité</span>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 28px" }}>

        {/* Title */}
        <div style={{ marginBottom: 28, animation: "fadeIn 0.4s ease" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.white, marginBottom: 5 }}>
            Surveillance des connexions
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            Audit temps réel — Détection RBA — Révocation admin
          </p>
        </div>

        {/* Stats Row 1 — général */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 14, animation: "fadeIn 0.4s ease 0.05s both" }}>
          <StatCard icon={<IcoDevice/>} label="Sessions actives"      value={stats?.total_active}       sub={`${days} derniers jours`} color={C.blue}   />
          <StatCard icon={<IcoAlert/>}  label="Sessions suspectes"    value={stats?.total_suspicious}   sub="À examiner"               color={C.orange} />
          <StatCard icon={<IcoUser/>}   label="Nouveaux devices auj." value={stats?.new_devices_today}  sub="Premières connexions"     color={C.accent} />
          <StatCard icon={<IcoGlobe/>}  label="Pays uniques"          value={stats?.unique_countries}   sub={`${days} derniers jours`} color={C.purple} />
        </div>

        {/* Stats Row 2 — RBA */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28, animation: "fadeIn 0.4s ease 0.08s both" }}>
          <StatCard icon={<IcoAlert/>}  label="Alertes HIGH (24h)"    value={stats?.high_risk_24h}      sub="Connexions à risque élevé" color={C.orange} />
          <StatCard icon={<IcoShield/>} label="CRITICAL (24h)"        value={stats?.critical_24h}       sub="Sessions bloquées"         color={C.red}    />
          <StatCard icon={<IcoUser/>}   label="'Pas moi' en attente"  value={stats?.not_me_pending}     sub="Signalements utilisateurs" color={C.purple} />
        </div>

        {/* Filtres */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
          animation: "fadeIn 0.4s ease 0.1s both" }}>

          {/* Période */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>Période :</span>
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${days === d ? C.accent : C.border}`,
                  background: days === d ? `${C.accent}20` : "transparent",
                  color: days === d ? C.accent : C.textSecondary, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                {d}j
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: C.border }} />

          {/* Statut */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Statut :</span>
            {[
              { v: "all",        l: "Tous" },
              { v: "active",     l: "Actif" },
              { v: "suspicious", l: "Suspect" },
              { v: "revoked",    l: "Révoqué" },
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setStatus(v)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${statusFilter === v ? C.blue : C.border}`,
                  background: statusFilter === v ? `${C.blue}20` : "transparent",
                  color: statusFilter === v ? C.blue : C.textSecondary, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: C.border }} />

          {/* Risque */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Risque :</span>
            {[
              { v: "all",      l: "Tous",     col: C.textSecondary },
              { v: "LOW",      l: "✅ LOW",   col: C.green  },
              { v: "MEDIUM",   l: "ℹ️ MED",  col: C.blue   },
              { v: "HIGH",     l: "⚠️ HIGH",  col: C.orange },
              { v: "CRITICAL", l: "🚨 CRIT",  col: C.red    },
            ].map(({ v, l, col }) => (
              <button key={v} onClick={() => setRiskFilter(v)}
                style={{ padding: "5px 12px", borderRadius: 20,
                  border: `1px solid ${riskFilter === v ? col : C.border}`,
                  background: riskFilter === v ? `${col}20` : "transparent",
                  color: riskFilter === v ? col : C.textSecondary, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: C.border }} />

          {/* Recherche */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par email..."
            style={{ flex: 1, minWidth: 180, padding: "7px 13px", background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.white, outline: "none" }}/>

          <button onClick={load}
            style={{ padding: "7px 14px", background: `${C.blue}18`, border: `1px solid ${C.blue}30`,
              borderRadius: 9, color: C.blue, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
            <IcoRefresh/> Actualiser
          </button>
        </div>

        {/* Table */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18,
          overflow: "hidden", animation: "fadeIn 0.4s ease 0.15s both" }}>

          <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.white }}>
              {displayed.length} session{displayed.length !== 1 ? "s" : ""}
              {riskFilter !== "all" && <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>· filtre: {riskFilter}</span>}
            </span>
            {loading && (
              <div style={{ width: 16, height: 16, border: `2px solid ${C.accent}`, borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Utilisateur", "Appareil", "Localisation", "IP", "1re connexion", "Dernière activité", "Logins", "Risque", "Statut", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 600,
                      color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && displayed.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 48, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                    Chargement...
                  </td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 48, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                    Aucune session trouvée pour cette période.
                  </td></tr>
                ) : displayed.map(s => {
                  const d   = s.device_info || {};
                  const loc = s.location    || {};
                  const isSuspicious = s.status === "suspicious";
                  const isRevoked    = s.status === "revoked";
                  const riskLevel    = s.risk_level || "LOW";
                  const riskColor    = RISK_MAP[riskLevel]?.color || C.green;
                  const isHighRisk   = riskLevel === "HIGH" || riskLevel === "CRITICAL";

                  return (
                    <tr key={s.id}
                      style={{ borderBottom: `1px solid ${C.border}20`,
                        background: s.reported_not_me ? `${C.red}10`
                          : isHighRisk   ? `${riskColor}06`
                          : isSuspicious ? `${C.orange}08`
                          : isRevoked    ? `${C.red}06`
                          : "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                      onMouseLeave={e => e.currentTarget.style.background =
                        s.reported_not_me ? `${C.red}10`
                          : isHighRisk   ? `${riskColor}06`
                          : isSuspicious ? `${C.orange}08`
                          : isRevoked    ? `${C.red}06`
                          : "transparent"}>

                      {/* Utilisateur */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>
                          {s.user_email || "—"}
                        </div>
                        {(s.user_prenom || s.user_nom) && (
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                            {s.user_prenom} {s.user_nom}
                          </div>
                        )}
                        {s.reported_not_me && (
                          <div style={{ fontSize: 10, color: C.red, marginTop: 3, fontWeight: 700 }}>
                            🚨 "Pas moi" signalé
                          </div>
                        )}
                      </td>

                      {/* Appareil */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <DeviceIcon type={d.device_type}/>
                          <div>
                            <div style={{ fontSize: 12, color: C.white, fontWeight: 500 }}>
                              {d.browser || "—"} {d.browser_version ? `${d.browser_version.split(".")[0]}` : ""}
                            </div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>{d.os || "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Localisation */}
                      <td style={{ padding: "12px 16px", fontSize: 12, color: C.textSecondary }}>
                        {loc.city && loc.country ? `${loc.city}, ${loc.country}` : loc.country || "—"}
                      </td>

                      {/* IP masquée */}
                      <td style={{ padding: "12px 16px", fontSize: 12, color: C.textMuted, fontFamily: "monospace" }}>
                        {s.ip_address
                          ? s.ip_address.split(".").slice(0, 2).concat(["xxx", "xxx"]).join(".")
                          : "—"}
                      </td>

                      {/* Première connexion */}
                      <td style={{ padding: "12px 16px", fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>
                        {fmtDate(s.first_seen_at)}
                      </td>

                      {/* Dernière activité */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 12, color: C.textSecondary }}>{timeAgo(s.last_seen_at)}</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>{fmtDate(s.last_seen_at)}</div>
                      </td>

                      {/* Login count */}
                      <td style={{ padding: "12px 16px", fontSize: 13, color: C.white, fontWeight: 600, textAlign: "center" }}>
                        {s.login_count ?? 1}
                      </td>

                      {/* Risque */}
                      <td style={{ padding: "12px 16px" }}>
                        <RiskBadge level={riskLevel} score={s.risk_score || 0}/>
                        <FactorTags factors={s.risk_factors}/>
                      </td>

                      {/* Statut */}
                      <td style={{ padding: "12px 16px" }}>
                        <StatusBadge status={s.status}/>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setDetail(s)}
                            style={{ padding: "5px 10px", background: `${C.blue}12`, border: `1px solid ${C.blue}25`,
                              borderRadius: 7, color: C.blue, cursor: "pointer", fontSize: 12 }}>
                            Détails
                          </button>
                          {s.status !== "revoked" && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Révoquer ce device (${s.user_email}) ?`)) return;
                                const r = await fetch(`${API}/admin/sessions/${s.id}/revoke`, {
                                  method: "PUT", headers,
                                });
                                if (r.ok) { setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: "revoked", is_blocked: true } : x)); load(); }
                              }}
                              style={{ padding: "5px 8px", background: `${C.red}12`, border: `1px solid ${C.red}25`,
                                borderRadius: 7, color: "#ff8080", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                              <IcoLock/> Révoquer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {detail && (
        <SessionDetailModal
          session={detail}
          token={token}
          onClose={() => setDetail(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
