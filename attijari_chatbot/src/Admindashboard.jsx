import { useState, useEffect } from "react";

const C = {
  red: "#D92D20", redDark: "#B42318",
  white: "#FFFFFF",                         // texte blanc sur fonds colorés (boutons, avatars)
  bg: "#F4F6FB", bgCard: "#FFFFFF", bgHover: "#F0F3F9",
  border: "#E4E8F0", accent: "#E8521A", gold: "#B7791F",
  ink: "#1B2538",                           // texte principal foncé (anciennement "white")
  textPrimary: "#1B2538", textSecondary: "#5A6478", textMuted: "#98A0B0",
  green: "#16A34A", blue: "#2563EB", orange: "#EA8204",
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap');`;

// Icons
const IcoUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoChat = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoMsg = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 9h8M8 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoPdf = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoShield = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoLogout = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoSearch = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoEye = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>;
const IcoPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
const IcoX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
const IcoUpload = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoSparkle = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.5 7h7l-5.5 4.5 2 7L12 16l-6 4.5 2-7L2.5 9h7L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoClient = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 21v-1a7 7 0 0 1 14 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoAlert = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>;
const IcoCalendar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// Logo
const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ background: "white", borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(27,37,56,0.08)" }}>
      <img src="/attijari-logo.png" alt="Attijari Bank" style={{ height: 26, display: "block" }} />
    </div>
    <span style={{ fontSize: 10, color: C.textMuted, fontStyle: "italic", fontFamily: "'Source Sans 3', sans-serif" }}>
      Admin Dashboard
    </span>
  </div>
);

// Stat Card
function StatCard({ icon, label, value, sub, color = C.red }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 26px", display: "flex", alignItems: "center", gap: 18, position: "relative", overflow: "hidden", transition: "border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 70, height: 70, borderRadius: "0 0 0 70px", background: `${color}10`, pointerEvents: "none" }}/>
      <div style={{ width: 50, height: 50, borderRadius: 13, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CLIENT SYNTHESIS MODAL — LE CLOU DU PROJET
// ═══════════════════════════════════════════════════════
function ClientDetailModal({ clientId, token, apiUrl, onClose }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [synthesis, setSynthesis] = useState(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    fetch(`${apiUrl}/admin/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setClient(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clientId]);

  const generateSynthesis = async () => {
    setSynthesisLoading(true);
    try {
      const res = await fetch(`${apiUrl}/admin/clients/${clientId}/synthesis`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSynthesis(data);
      }
    } catch {} finally {
      setSynthesisLoading(false);
    }
  };

  const copySynthesis = () => {
    if (synthesis?.synthesis) {
      navigator.clipboard.writeText(synthesis.synthesis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtMoney = n => n != null ? `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DT` : "—";

  // Convert markdown-like synthesis to HTML
  const renderSynthesis = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginTop: 16, marginBottom: 8, fontFamily: "'Source Sans 3', sans-serif" }}>{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("- **") || line.startsWith("- ")) {
        const content = line.replace(/^- /, "");
        return (
          <div key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 5, paddingLeft: 14, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: C.accent }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${C.ink}">$1</strong>`) }} />
          </div>
        );
      }
      if (/^\d+\./.test(line)) {
        return (
          <div key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6, paddingLeft: 4 }}
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${C.accent}">$1</strong>`) }} />
        );
      }
      if (line.trim() === "") return <div key={i} style={{ height: 6 }}/>;
      return <div key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6, lineHeight: 1.5 }}>{line}</div>;
    });
  };

  if (!clientId) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,37,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: 760, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 50px rgba(27,37,56,0.16)", animation: "fadeUp 0.25s ease" }} onClick={e => e.stopPropagation()}>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Chargement...</div>
        ) : !client ? (
          <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Client non trouvé</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.red})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 20, fontWeight: 700 }}>
                  {`${client.prenom?.[0]||""}${client.nom?.[0]||""}`.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{client.civilite} {client.prenom} {client.nom}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{client.profession} · {client.ville} · {client.age} ans</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                    <span style={{ background: `${C.accent}20`, color: C.accent, fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 20, textTransform: "uppercase" }}>{client.segment}</span>
                    <span style={{ background: `${C.green}20`, color: C.green, fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>Client depuis {client.anciennete_annees} ans</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><IcoX/></button>
            </div>

            {/* AI SYNTHESIS CTA (si pas encore généré) */}
            {!synthesis && (
              <div style={{ background: `linear-gradient(135deg, ${C.accent}15, ${C.red}15)`, border: `1.5px solid ${C.accent}40`, borderRadius: 14, padding: "20px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.red})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, flexShrink: 0 }}>
                    <IcoSparkle/>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>🤖 Préparation RDV automatique</div>
                    <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.4 }}>
                      Laissez l'IA analyser les données et générer une fiche de préparation personnalisée pour votre rendez-vous.
                    </div>
                  </div>
                </div>
                <button onClick={generateSynthesis} disabled={synthesisLoading}
                  style={{ padding: "11px 20px", background: synthesisLoading ? C.bgHover : `linear-gradient(135deg, ${C.accent}, ${C.red})`, border: "none", borderRadius: 10, color: C.white, cursor: synthesisLoading ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "'Source Sans 3', sans-serif", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {synthesisLoading ? (
                    <>
                      <div style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                      Analyse en cours...
                    </>
                  ) : (
                    <><IcoSparkle/> Générer la synthèse</>
                  )}
                </button>
              </div>
            )}

            {/* SYNTHESIS RESULT */}
            {synthesis && (
              <div style={{ background: C.bg, border: `1px solid ${C.accent}40`, borderRadius: 14, padding: "20px 24px", marginBottom: 20, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.red})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white }}>
                      <IcoSparkle/>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Synthèse IA générée</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>Modèle: {synthesis.metadata?.model} · {new Date(synthesis.metadata?.generated_at).toLocaleString("fr-FR")}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={copySynthesis}
                      style={{ padding: "6px 12px", background: copied ? `${C.green}20` : C.bgCard, border: `1px solid ${copied ? C.green : C.border}`, borderRadius: 8, color: copied ? C.green : C.textSecondary, cursor: "pointer", fontSize: 11, fontFamily: "'Source Sans 3', sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}>
                      <IcoCopy/> {copied ? "Copié!" : "Copier"}
                    </button>
                    <button onClick={() => { setSynthesis(null); generateSynthesis(); }}
                      style={{ padding: "6px 12px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSecondary, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                      ↻ Régénérer
                    </button>
                  </div>
                </div>
                <div>{renderSynthesis(synthesis.synthesis)}</div>
              </div>
            )}

            {/* Infos + Finance Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Infos</div>
                <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 2 }}>
                  <div>📧 {client.email}</div>
                  <div>📞 {client.telephone}</div>
                  <div>💼 {client.situation_familiale}, {client.enfants} enfant{client.enfants !== 1 ? "s" : ""}</div>
                  <div>📅 Client depuis {fmtDate(client.date_ouverture)}</div>
                </div>
              </div>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Finance</div>
                <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 2 }}>
                  <div>💰 Revenus: <strong style={{ color: C.ink }}>{fmtMoney(client.revenus_mensuels)}/mois</strong></div>
                  <div>🏦 Produits actifs: <strong style={{ color: C.ink }}>{client.produits?.length || 0}</strong></div>
                  <div>📊 Transactions récentes: <strong style={{ color: C.ink }}>{client.transactions_recentes?.length || 0}</strong></div>
                  <div>⚠️ Alertes: <strong style={{ color: client.alertes?.length > 0 ? C.orange : C.green }}>{client.alertes?.length || 0}</strong></div>
                </div>
              </div>
            </div>

            {/* Alertes */}
            {client.alertes?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>⚠️ Alertes</div>
                {client.alertes.map((a, i) => (
                  <div key={i} style={{ background: `${C.orange}15`, border: `1px solid ${C.orange}35`, borderRadius: 8, padding: "9px 14px", marginBottom: 6, fontSize: 12, color: C.orange, display: "flex", alignItems: "center", gap: 8 }}>
                    <IcoAlert/> {a.message}
                  </div>
                ))}
              </div>
            )}

            {/* Produits */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>💳 Produits bancaires ({client.produits?.length || 0})</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(client.produits || []).map((p, i) => (
                  <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{p.nom}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
                      {p.solde != null && <div>Solde: {fmtMoney(p.solde)}</div>}
                      {p.capital_restant != null && <div>Capital restant: {fmtMoney(p.capital_restant)}</div>}
                      {p.mensualite != null && <div>Mensualité: {fmtMoney(p.mensualite)}</div>}
                      {p.contribution_mensuelle != null && <div>Contribution: {fmtMoney(p.contribution_mensuelle)}/mois</div>}
                      {p.prime_annuelle != null && <div>Prime: {fmtMoney(p.prime_annuelle)}/an</div>}
                      {p.date_expiration && <div style={{ color: C.orange }}>Expire: {fmtDate(p.date_expiration)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions */}
            <div>
              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>📊 Dernières transactions</div>
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
                {(client.transactions_recentes || []).slice(0, 10).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: i === 9 ? "none" : `1px solid ${C.border}40` }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: t.sens === "credit" ? `${C.green}20` : `${C.red}20`, color: t.sens === "credit" ? C.green : C.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {t.sens === "credit" ? "+" : "−"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: C.ink, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>{fmtDate(t.date)} · {t.type}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.sens === "credit" ? C.green : C.textSecondary, whiteSpace: "nowrap" }}>
                      {t.sens === "credit" ? "+" : "−"}{fmtMoney(t.montant)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CLIENTS TAB
// ═══════════════════════════════════════════════════════
function ClientsTable({ token, apiUrl }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [stats, setStats] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (segment !== "all") params.append("segment", segment);
      const r = await fetch(`${apiUrl}/admin/clients?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const data = await r.json();
        setClients(data.clients || []);
        setStats(data.stats);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [search, segment]);

  return (
    <>
      {/* Sub-stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total clients</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginTop: 2 }}>{stats.total}</div>
          </div>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Particuliers</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.accent, marginTop: 2 }}>{stats.by_segment?.particulier || 0}</div>
          </div>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Professionnels</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.blue, marginTop: 2 }}>{stats.by_segment?.professionnel || 0}</div>
          </div>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Avec alertes</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.orange, marginTop: 2 }}>{stats.with_alerts}</div>
          </div>
        </div>
      )}

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", animation: "fadeIn 0.4s ease" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>👥 Base clients</h2>
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{clients.length} résultat{clients.length !== 1 ? "s" : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={segment} onChange={e => setSegment(e.target.value)}
              style={{ padding: "7px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink, fontSize: 12, fontFamily: "'Source Sans 3', sans-serif", cursor: "pointer" }}>
              <option value="all">Tous segments</option>
              <option value="particulier">Particuliers</option>
              <option value="professionnel">Professionnels</option>
              <option value="jeune">Jeunes</option>
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 13px", minWidth: 240 }}>
              <span style={{ color: C.textMuted }}><IcoSearch/></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom, ville, profession..."
                style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: C.ink, fontFamily: "'Source Sans 3', sans-serif", width: "100%" }}/>
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: C.bgCard, zIndex: 1 }}>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Client", "Profession", "Segment", "Revenus", "Ancienneté", "Produits", "Alertes", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Chargement...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Aucun client trouvé</td></tr>
              ) : clients.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}20`, transition: "background 0.15s", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setSelectedClient(c.id)}>
                  <td style={{ padding: "11px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}70, ${C.red}70)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 11, fontWeight: 700 }}>
                        {`${c.prenom?.[0]||""}${c.nom?.[0]||""}`.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{c.prenom} {c.nom}</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>{c.age} ans · {c.ville}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 12, color: C.textSecondary, textTransform: "capitalize" }}>{c.profession}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ background: c.segment === "professionnel" ? `${C.blue}20` : `${C.accent}20`, color: c.segment === "professionnel" ? C.blue : C.accent, fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 20, textTransform: "capitalize" }}>{c.segment}</span>
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: C.ink, fontWeight: 600, whiteSpace: "nowrap" }}>{c.revenus_mensuels} DT</td>
                  <td style={{ padding: "11px 16px", fontSize: 12, color: C.textMuted }}>{c.anciennete_annees} ans</td>
                  <td style={{ padding: "11px 16px", textAlign: "center" }}>
                    <span style={{ background: `${C.green}18`, color: C.green, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>{c.num_produits}</span>
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "center" }}>
                    {c.num_alertes > 0 ? (
                      <span style={{ background: `${C.orange}20`, color: C.orange, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>{c.num_alertes}</span>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <button onClick={e => { e.stopPropagation(); setSelectedClient(c.id); }}
                      style={{ padding: "5px 12px", background: `linear-gradient(135deg, ${C.accent}, ${C.red})`, border: "none", borderRadius: 7, color: C.white, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600 }}>
                      <IcoSparkle/> Préparer RDV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
        <ClientDetailModal
          clientId={selectedClient}
          token={token}
          apiUrl={apiUrl}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// SHARE PDF MODAL (inchangé)
// ═══════════════════════════════════════════════════════
function SharePdfModal({ token, apiUrl, onClose, onSuccess }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}/admin/users_list`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => setUsers(d.users || []))
      .catch(() => setError("Impossible de charger les utilisateurs"))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(u => `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  const toggleUser = (userId) => {
    setSelectedUsers(prev => { const next = new Set(prev); if (next.has(userId)) next.delete(userId); else next.add(userId); return next; });
  };

  const toggleAll = () => {
    if (selectedUsers.size === filteredUsers.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
  };

  const handleSubmit = async () => {
    if (!pdfFile) { setError("Veuillez sélectionner un PDF"); return; }
    if (selectedUsers.size === 0) { setError("Veuillez sélectionner au moins un utilisateur"); return; }
    setUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("shared_with", JSON.stringify(Array.from(selectedUsers)));
      formData.append("description", description);
      const res = await fetch(`${apiUrl}/admin/upload_shared_pdf`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Erreur"); }
      const data = await res.json();
      onSuccess(data);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,37,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 30, width: 560, maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 50px rgba(27,37,56,0.16)", animation: "fadeUp 0.25s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 3 }}>📤 Partager un document PDF</h2>
            <p style={{ fontSize: 12, color: C.textMuted }}>Sélectionnez le PDF et les destinataires</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><IcoX/></button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Document PDF *</label>
          <label htmlFor="pdf-upload-input" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: C.bg, border: `1.5px dashed ${pdfFile ? C.accent : C.border}`, borderRadius: 10, cursor: "pointer" }}>
            <div style={{ color: pdfFile ? C.accent : C.textMuted }}><IcoUpload/></div>
            <div style={{ flex: 1 }}>
              {pdfFile ? (
                <>
                  <div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{pdfFile.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: C.textSecondary }}>Cliquez pour choisir un PDF</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Maximum 30 MB</div>
                </>
              )}
            </div>
          </label>
          <input id="pdf-upload-input" type="file" accept=".pdf,application/pdf" onChange={e => setPdfFile(e.target.files[0])} style={{ display: "none" }}/>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Nouvelle circulaire BCT janvier 2026"
            style={{ width: "100%", padding: "11px 14px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.ink, outline: "none" }}/>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Destinataires * ({selectedUsers.size})
            </label>
            <button onClick={toggleAll} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              {selectedUsers.size === filteredUsers.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 13px", marginBottom: 8 }}>
            <span style={{ color: C.textMuted }}><IcoSearch/></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ background: "none", border: "none", outline: "none", fontSize: 12, color: C.ink, width: "100%" }}/>
          </div>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 12 }}>Chargement...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 12 }}>Aucun utilisateur</div>
            ) : filteredUsers.map(u => {
              const selected = selectedUsers.has(u.id);
              return (
                <div key={u.id} onClick={() => toggleUser(u.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}40`, background: selected ? `${C.accent}15` : "transparent" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${selected ? C.accent : C.border}`, background: selected ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}60, ${C.red}60)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {`${u.prenom?.[0] || ""}${u.nom?.[0] || ""}`.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{u.prenom} {u.nom}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{u.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}30`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ff8080", marginBottom: 16 }}>⚠️ {error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={uploading} style={{ flex: 1, padding: "12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSecondary, cursor: uploading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>Annuler</button>
          <button onClick={handleSubmit} disabled={uploading || !pdfFile || selectedUsers.size === 0}
            style={{ flex: 2, padding: "12px", background: (uploading || !pdfFile || selectedUsers.size === 0) ? C.bgHover : `linear-gradient(135deg, ${C.accent}, ${C.red})`, border: "none", borderRadius: 10, color: C.white, cursor: (uploading || !pdfFile || selectedUsers.size === 0) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {uploading ? "📤 Partage..." : `Partager avec ${selectedUsers.size} personne${selectedUsers.size > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SHARED PDFs TABLE
// ═══════════════════════════════════════════════════════
function SharedPdfsTable({ token, apiUrl }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchPdfs = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiUrl}/admin/shared_pdfs`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setPdfs((await r.json()).pdfs || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPdfs(); }, []);

  const deletePdf = async (pdfId) => {
    if (!confirm("Supprimer ce PDF partagé ?")) return;
    await fetch(`${apiUrl}/admin/shared_pdfs/${pdfId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setPdfs(prev => prev.filter(p => p.pdf_id !== pdfId));
  };

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", animation: "fadeIn 0.4s ease" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>📚 PDFs partagés</h2>
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{pdfs.length} document{pdfs.length !== 1 ? "s" : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchPdfs} style={{ padding: "7px 14px", background: `${C.red}18`, border: `1px solid ${C.red}30`, borderRadius: 9, color: C.red, cursor: "pointer", fontSize: 12 }}>↻ Rafraîchir</button>
            <button onClick={() => setShowShareModal(true)} style={{ padding: "7px 14px", background: `linear-gradient(135deg, ${C.accent}, ${C.red})`, border: "none", borderRadius: 9, color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <IcoPlus/> Nouveau partage
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Document", "Description", "Partagé par", "Destinataires", "Lu par", "Date", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Chargement...</td></tr>
              ) : pdfs.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Aucun PDF partagé.</td></tr>
              ) : pdfs.map(p => (
                <tr key={p.pdf_id} style={{ borderBottom: `1px solid ${C.border}20` }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.gold}25`, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, flexShrink: 0 }}><IcoPdf/></div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{p.file_name}</div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{p.num_pages} page{p.num_pages > 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: C.textSecondary, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.description || "—"}</td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: C.textSecondary }}>{p.uploaded_by}</td>
                  <td style={{ padding: "13px 18px", maxWidth: 260 }}>
                    {(!p.shared_with_names || p.shared_with_names.length === 0) ? (
                      <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {p.shared_with_names.map(u => {
                          const seen = (p.viewed_by || []).includes(u.id);
                          return (
                            <span key={u.id} title={`${u.email}${seen ? " · a consulté" : " · pas encore lu"}`}
                              style={{ background: seen ? `${C.green}20` : `${C.accent}18`, color: seen ? C.green : C.accent, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {seen ? "✓" : "•"} {u.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "13px 18px" }}>
                    <span style={{ background: p.viewed_by_count > 0 ? `${C.green}20` : `${C.textMuted}20`, color: p.viewed_by_count > 0 ? C.green : C.textMuted, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.viewed_by_count} / {p.shared_with_count}</span>
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>{fmtDate(p.uploaded_at)}</td>
                  <td style={{ padding: "13px 18px" }}>
                    <button onClick={() => deletePdf(p.pdf_id)}
                      style={{ padding: "5px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, color: C.textMuted, cursor: "pointer", display: "flex" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                      <IcoTrash/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showShareModal && (
        <SharePdfModal token={token} apiUrl={apiUrl} onClose={() => setShowShareModal(false)} onSuccess={() => fetchPdfs()}/>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// 2FA EMAIL MODAL
// ═══════════════════════════════════════════════════════
function TwoFAEmailModal({ user, token, apiUrl, onClose, onSaved }) {
  const [email, setEmail]           = useState(user.two_fa_email || "");
  const [loading, setLoading]       = useState(false);
  const [testing, setTesting]       = useState(false);
  const [error, setError]           = useState("");
  const [testMsg, setTestMsg]       = useState("");
  const [testOk, setTestOk]         = useState(null);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid  = EMAIL_RE.test(email.trim());

  const handleSave = async () => {
    if (!isValid) { setError("Format email invalide"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiUrl}/admin/users/${user.id}/2fa-email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ two_fa_email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Erreur"); return; }
      onSaved({ ...user, two_fa_email: email.trim(), two_fa_email_status: "custom" });
      onClose();
    } catch { setError("Erreur réseau"); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!confirm("Réinitialiser l'email 2FA ? Le code sera envoyé à l'email de login.")) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiUrl}/admin/users/${user.id}/2fa-email`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Erreur"); return; }
      setEmail("");
      onSaved({ ...user, two_fa_email: "", two_fa_email_status: "fallback" });
      onClose();
    } catch { setError("Erreur réseau"); }
    finally { setLoading(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestMsg(""); setTestOk(null);
    try {
      const res = await fetch(`${apiUrl}/admin/users/${user.id}/2fa-email/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) { setTestMsg(`Email de test envoyé à ${data.sent_to}`); setTestOk(true); }
      else { setTestMsg(data.detail || "Echec envoi"); setTestOk(false); }
    } catch { setTestMsg("Erreur réseau"); setTestOk(false); }
    finally { setTesting(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,37,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: 460, boxShadow: "0 20px 50px rgba(27,37,56,0.16)", animation: "fadeUp 0.25s ease" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 3 }}>Email de réception 2FA</h3>
            <p style={{ fontSize: 12, color: C.textMuted }}>{user.prenom} {user.nom} · {user.email}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }}><IcoX/></button>
        </div>

        {/* Info banner */}
        <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
          🔐 Le code de vérification sera envoyé à cette adresse lors de chaque connexion.<br/>
          Si vide, le code est envoyé à l'email de login (<strong style={{ color: C.ink }}>{user.email}</strong>).
        </div>

        {/* Email input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Email 2FA dédié
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); setTestMsg(""); setTestOk(null); }}
              placeholder={`${user.email} (par défaut)`}
              style={{ flex: 1, padding: "10px 14px", background: C.bg, border: `1.5px solid ${error ? C.red : email && isValid ? C.green : C.border}`, borderRadius: 9, fontSize: 13, color: C.ink, outline: "none", fontFamily: "inherit" }}
            />
            <button onClick={handleTest} disabled={testing || !isValid}
              style={{ padding: "10px 14px", background: testing ? C.bgHover : `${C.blue}22`, border: `1px solid ${C.blue}40`, borderRadius: 9, color: C.blue, cursor: testing || !isValid ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", opacity: !isValid ? 0.4 : 1 }}>
              {testing ? "..." : "Tester"}
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: "#ff8080", marginTop: 5 }}>⚠️ {error}</p>}
        </div>

        {/* Test feedback */}
        {testMsg && (
          <div style={{ background: testOk ? `${C.green}12` : `${C.red}12`, border: `1px solid ${testOk ? C.green : C.red}30`, borderRadius: 8, padding: "9px 14px", fontSize: 12, color: testOk ? C.green : "#ff8080", marginBottom: 14 }}>
            {testOk ? "✓ " : "✗ "}{testMsg}
          </div>
        )}

        {/* Current status */}
        <div style={{ background: C.bg, borderRadius: 9, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: C.textMuted }}>
          Statut actuel :&nbsp;
          {user.two_fa_email_status === "custom"
            ? <><span style={{ background: `${C.accent}20`, color: C.accent, padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Custom</span> &nbsp;<span style={{ color: C.ink }}>{user.two_fa_email}</span></>
            : <><span style={{ background: `${C.textMuted}20`, color: C.textMuted, padding: "1px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Fallback</span> &nbsp;<span style={{ color: C.textSecondary }}>{user.email}</span></>
          }
          {user.two_fa_email_updated_at && (
            <span style={{ marginLeft: 8, fontSize: 10, color: C.textMuted }}>
              · modifié le {new Date(user.two_fa_email_updated_at).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, cursor: "pointer", fontSize: 13 }}>
            Annuler
          </button>
          {user.two_fa_email_status === "custom" && (
            <button onClick={handleReset} disabled={loading} style={{ padding: "11px 16px", background: `${C.red}12`, border: `1px solid ${C.red}30`, borderRadius: 10, color: "#ff8080", cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
              Réinitialiser
            </button>
          )}
          <button onClick={handleSave} disabled={loading || !isValid} style={{ flex: 2, padding: "11px", background: loading || !isValid ? C.bgHover : `linear-gradient(135deg, ${C.accent}, ${C.red})`, border: "none", borderRadius: 10, color: C.white, cursor: loading || !isValid ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// USER MODAL
// ═══════════════════════════════════════════════════════
function UserModal({ user, token, apiUrl, onClose, onDelete }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!user || !token) return;
    fetch(`${apiUrl}/admin/users/${user.id}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => d && setStats(d)).catch(() => {});
  }, [user]);
  if (!user) return null;
  const initials = `${user.prenom?.[0]||""}${user.nom?.[0]||""}`.toUpperCase();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,37,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 30, width: 400, boxShadow: "0 20px 50px rgba(27,37,56,0.16)", animation: "fadeUp 0.25s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.red})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 17, fontWeight: 700 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{user.prenom} {user.nom}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          {[["Téléphone", user.telephone || "—"], ["Inscrit le", user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"], ["Conversations", stats?.total_conversations ?? "..."], ["Messages", stats?.total_messages ?? "..."]].map(([k, v]) => (
            <div key={k} style={{ background: C.bg, borderRadius: 9, padding: "11px 14px" }}>
              <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>{String(v)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMuted, cursor: "pointer", fontSize: 13 }}>Fermer</button>
          <button onClick={() => { onDelete(user.id); onClose(); }} style={{ padding: "11px 16px", background: `${C.red}18`, border: `1px solid ${C.red}35`, borderRadius: 10, color: "#ff8080", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <IcoTrash/> Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// APPOINTMENTS TAB — Demandes de RDV admin
// ═══════════════════════════════════════════════════════
function AppointmentsTab({ token, apiUrl }) {
  const [appointments, setAppointments] = useState([]);
  const [confirmedAppointments, setConfirmedAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { id, clientName }
  const [rejectReason, setRejectReason] = useState("");
  const [cancelModal, setCancelModal]   = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [reproModal, setReproModal]     = useState(null); // { id, clientName }
  const [reproSlots, setReproSlots]     = useState([]);   // [{date, start_time, end_time}] selected by admin
  const [reproMessage, setReproMessage] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]); // slots to pick from
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const inTwoWeeks = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
      const [pendingRes, statsRes, calendarRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/appointments/pending`, { headers }),
        fetch(`${apiUrl}/api/admin/appointments/stats`, { headers }),
        fetch(`${apiUrl}/api/admin/appointments/calendar?start_date=${today}&end_date=${inTwoWeeks}`, { headers }),
      ]);
      if (pendingRes.ok) {
        setAppointments((await pendingRes.json()).appointments || []);
      } else {
        const err = await pendingRes.json().catch(() => ({}));
        setFetchError(`Erreur ${pendingRes.status}: ${err.detail || pendingRes.statusText}`);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (calendarRes.ok) {
        const cal = await calendarRes.json();
        setConfirmedAppointments((cal.appointments || []).filter(a => a.status === "confirmed"));
      }
    } catch (e) {
      setFetchError(`Erreur réseau: ${e.message}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (id, clientName) => {
    setActionLoading(id + "_approve");
    try {
      const res = await fetch(`${apiUrl}/api/admin/appointments/${id}/approve`, { method: "POST", headers });
      if (res.ok) {
        showToast(`✅ RDV de ${clientName} confirmé — le client est notifié`);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Erreur lors de la confirmation", "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    const { id, clientName } = rejectModal;
    setActionLoading(id + "_reject");
    try {
      const res = await fetch(`${apiUrl}/api/admin/appointments/${id}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (res.ok) {
        showToast(`RDV de ${clientName} refusé — le client est notifié`);
        setRejectModal(null);
        setRejectReason("");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Erreur lors du refus", "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
    finally { setActionLoading(null); }
  };

  const openReproModal = async (appt) => {
    setReproModal({ id: appt.id, clientName: appt.client_name });
    setReproSlots([]);
    setReproMessage("");
    setLoadingSlots(true);
    try {
      const days = [];
      for (let i = 1; i <= 30; i++) {
        const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
        days.push(d);
      }
      const results = await Promise.all(
        days.map(d => fetch(`${apiUrl}/api/appointments/availability/day?date=${d}`, { headers })
          .then(r => r.ok ? r.json() : { slots: [] })
          .then(data => ({ date: d, slots: (data.slots || []).filter(s => s.available) }))
        )
      );
      const all = [];
      results.forEach(({ date, slots }) =>
        slots.forEach(s => all.push({ date, start_time: s.start, end_time: s.end }))
      );
      setAvailableSlots(all);
    } catch { setAvailableSlots([]); }
    finally { setLoadingSlots(false); }
  };

  const toggleSlot = (slot) => {
    const key = `${slot.date}_${slot.start_time}`;
    setReproSlots(prev => {
      const exists = prev.find(s => `${s.date}_${s.start_time}` === key);
      if (exists) return prev.filter(s => `${s.date}_${s.start_time}` !== key);
      if (prev.length >= 3) return prev;
      return [...prev, slot];
    });
  };

  const handleAdvisorRepro = async () => {
    if (reproSlots.length < 2) return;
    setActionLoading(reproModal.id + "_repro");
    try {
      const res = await fetch(`${apiUrl}/api/admin/appointments/${reproModal.id}/propose-alternatives`, {
        method: "POST",
        headers,
        body: JSON.stringify({ slots: reproSlots.map(s => ({ date: s.date, start_time: s.start_time })), message: reproMessage.trim() }),
      });
      if (res.ok) {
        showToast(`🔄 ${reproSlots.length} créneaux proposés à ${reproModal.clientName}`);
        setReproModal(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Erreur", "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
    finally { setActionLoading(null); }
  };

  const handleAdvisorCancel = async () => {
    if (!cancelReason.trim()) return;
    const { id, clientName } = cancelModal;
    setActionLoading(id + "_cancel");
    try {
      const res = await fetch(`${apiUrl}/api/admin/appointments/${id}/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (res.ok) {
        showToast(`⚠️ RDV de ${clientName} annulé — le client est notifié`);
        setCancelModal(null);
        setCancelReason("");
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Erreur lors de l'annulation", "error");
      }
    } catch { showToast("Erreur réseau", "error"); }
    finally { setActionLoading(null); }
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const fmtRelative = (isoStr) => {
    if (!isoStr) return "";
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    return `il y a ${Math.floor(hrs / 24)}j`;
  };

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 2000,
          background: toast.type === "error" ? "#2a1010" : "#0f2a0f",
          border: `1px solid ${toast.type === "error" ? C.red : C.green}`,
          borderRadius: 12, padding: "13px 22px", color: C.white,
          fontSize: 13, fontWeight: 600, boxShadow: "0 8px 28px rgba(27,37,56,0.22)",
          animation: "fadeUp 0.3s ease", maxWidth: 400,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Stats mini-cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "En attente", value: stats.pending, color: C.orange, icon: "⏳" },
            { label: "Confirmés aujourd'hui", value: stats.confirmed_today, color: C.green, icon: "✅" },
            { label: "Cette semaine", value: stats.confirmed_this_week, color: C.blue, icon: "📅" },
            { label: "Ce mois", value: stats.total_this_month, color: C.gold, icon: "📊" },
          ].map(s => (
            <div key={s.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {/* Liste des demandes */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", animation: "fadeIn 0.4s ease" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 10 }}>
              📅 Demandes de rendez-vous en attente
              {stats?.pending > 0 && (
                <span style={{ background: C.orange, color: "#000", fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
                  {stats.pending}
                </span>
              )}
            </h2>
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
              Confirmez ou refusez chaque demande — le client est automatiquement notifié
            </p>
          </div>
          <button onClick={fetchData}
            style={{ padding: "7px 14px", background: `${C.red}18`, border: `1px solid ${C.red}30`, borderRadius: 9, color: C.red, cursor: "pointer", fontSize: 12 }}>
            ↻ Rafraîchir
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Chargement...</div>
        ) : fetchError ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}40`, borderRadius: 12, padding: "18px 24px", display: "inline-block", maxWidth: 500 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ff8080", marginBottom: 8 }}>⚠️ Erreur de chargement</div>
              <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: "monospace" }}>{fetchError}</div>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: 70, textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Aucune demande en attente</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>Toutes les demandes ont été traitées</div>
          </div>
        ) : (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {appointments.map(appt => (
              <div key={appt.id}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 18, transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.orange}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>

                {/* Avatar client */}
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}80, ${C.red}80)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {(appt.client_name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>

                {/* Infos RDV */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{appt.client_name}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{appt.client_email}</span>
                    <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto", whiteSpace: "nowrap" }}>
                      {fmtRelative(appt.created_at)}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: appt.notes_client ? 8 : 0 }}>
                    <span style={{ background: `${C.orange}20`, color: C.orange, fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20 }}>
                      📅 {fmtDate(appt.date)}
                    </span>
                    <span style={{ background: `${C.blue}20`, color: C.blue, fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20 }}>
                      🕐 {appt.start_time} – {appt.end_time}
                    </span>
                    <span style={{ background: `${C.gold}18`, color: C.gold, fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20 }}>
                      {appt.motif_icon} {appt.motif_label}
                    </span>
                  </div>
                  {appt.notes_client && (
                    <div style={{ fontSize: 12, color: C.textSecondary, fontStyle: "italic", background: `${C.border}50`, borderRadius: 8, padding: "6px 10px" }}>
                      💬 "{appt.notes_client}"
                    </div>
                  )}
                </div>

                {/* Boutons action */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleApprove(appt.id, appt.client_name)}
                    disabled={!!actionLoading}
                    style={{ padding: "9px 18px", background: actionLoading === appt.id + "_approve" ? C.bgHover : `${C.green}22`, border: `1px solid ${C.green}55`, borderRadius: 9, color: C.green, cursor: actionLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = `${C.green}40`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${C.green}22`; }}>
                    {actionLoading === appt.id + "_approve" ? <><div style={{ width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/> Traitement...</> : <><IcoCheck/> Confirmer</>}
                  </button>
                  <button
                    onClick={() => { setRejectModal({ id: appt.id, clientName: appt.client_name }); setRejectReason(""); }}
                    disabled={!!actionLoading}
                    style={{ padding: "9px 18px", background: `${C.red}15`, border: `1px solid ${C.red}40`, borderRadius: 9, color: "#ff8080", cursor: actionLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = `${C.red}30`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${C.red}15`; }}>
                    <IcoX/> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section RDV Confirmés (14 prochains jours) */}
      {confirmedAppointments.length > 0 && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", marginTop: 20, animation: "fadeIn 0.4s ease" }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 10 }}>
                ✅ RDV confirmés — 60 prochains jours
                <span style={{ background: `${C.green}25`, color: C.green, fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
                  {confirmedAppointments.length}
                </span>
              </h2>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                En cas d'imprévu, annulez le RDV — le client sera notifié et pourra re-réserver
              </p>
            </div>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {confirmedAppointments.map(appt => (
              <div key={appt.id}
                style={{ background: C.bg, border: `1px solid ${C.green}30`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 18 }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.green}60, ${C.green}30)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {(appt.client_name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{appt.client_name}</span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{appt.client_email}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ background: `${C.green}20`, color: C.green, fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20 }}>
                      📅 {fmtDate(appt.date)}
                    </span>
                    <span style={{ background: `${C.blue}20`, color: C.blue, fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20 }}>
                      🕐 {appt.start_time} – {appt.end_time}
                    </span>
                    <span style={{ background: `${C.gold}18`, color: C.gold, fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20 }}>
                      {appt.motif_icon} {appt.motif_label}
                    </span>
                    {appt.advisor_name && (
                      <span style={{ background: `${C.accent}18`, color: C.accent, fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 20 }}>
                        👤 {appt.advisor_name}
                      </span>
                    )}
                  </div>
                </div>
                {/* Boutons action */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => openReproModal(appt)}
                    disabled={!!actionLoading}
                    style={{ padding: "9px 16px", background: `${C.blue}18`, border: `1px solid ${C.blue}50`, borderRadius: 9, color: C.blue, cursor: actionLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = `${C.blue}35`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${C.blue}18`; }}>
                    🔄 Reprogrammer
                  </button>
                  <button
                    onClick={() => { setCancelModal({ id: appt.id, clientName: appt.client_name, date: appt.date, startTime: appt.start_time }); setCancelReason(""); }}
                    disabled={!!actionLoading}
                    style={{ padding: "9px 16px", background: `${C.orange}18`, border: `1px solid ${C.orange}50`, borderRadius: 9, color: C.orange, cursor: actionLoading ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = `${C.orange}35`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${C.orange}18`; }}>
                    {actionLoading === appt.id + "_cancel"
                      ? <><div style={{ width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/> Traitement...</>
                      : <>⚠️ Annuler</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de refus */}
      {rejectModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(27,37,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)" }}
          onClick={() => { setRejectModal(null); setRejectReason(""); }}>
          <div
            style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 30, width: 480, boxShadow: "0 20px 50px rgba(27,37,56,0.16)", animation: "fadeUp 0.25s ease" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Refuser la demande</h3>
                <p style={{ fontSize: 12, color: C.textMuted }}>Client : <strong style={{ color: C.ink }}>{rejectModal.clientName}</strong></p>
              </div>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }}>
                <IcoX/>
              </button>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Motif du refus *
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ex: Créneau non disponible. Merci de choisir une autre date..."
                rows={4}
                autoFocus
                style={{ width: "100%", padding: "12px 14px", background: C.bg, border: `1.5px solid ${rejectReason.trim() ? C.border : C.red + "50"}`, borderRadius: 10, fontSize: 13, color: C.ink, outline: "none", resize: "vertical", fontFamily: "'Source Sans 3', sans-serif", lineHeight: 1.5 }}
              />
              <div style={{ fontSize: 11, color: rejectReason.trim() ? C.textMuted : "#ff8080", marginTop: 5 }}>
                {rejectReason.trim() ? `${rejectReason.length} caractères` : "Ce champ est requis — le client recevra ce message"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                style={{ flex: 1, padding: "12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || !!actionLoading}
                style={{ flex: 2, padding: "12px", background: (!rejectReason.trim() || !!actionLoading) ? C.bgHover : `${C.red}CC`, border: `1px solid ${C.red}60`, borderRadius: 10, color: C.white, cursor: (!rejectReason.trim() || !!actionLoading) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s" }}>
                {actionLoading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                    Traitement...
                  </span>
                ) : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal reprogrammation — sélection de 2 à 3 créneaux */}
      {reproModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,37,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)" }}
          onClick={() => setReproModal(null)}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.blue}50`, borderRadius: 20, padding: 28, width: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(27,37,56,0.16)", animation: "fadeUp 0.25s ease" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 4 }}>🔄 Reprogrammer le rendez-vous</h3>
                <p style={{ fontSize: 12, color: C.textMuted }}>Client : <strong style={{ color: C.ink }}>{reproModal.clientName}</strong> — Sélectionnez 2 ou 3 créneaux</p>
              </div>
              <button onClick={() => setReproModal(null)} style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer" }}><IcoX/></button>
            </div>

            {/* Créneaux sélectionnés */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {reproSlots.map((s, i) => (
                <div key={i} style={{ background: `${C.blue}30`, border: `1px solid ${C.blue}60`, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: C.blue, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  {["A","B","C"][i]} — {s.date} {s.start_time}
                  <button onClick={() => toggleSlot(s)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              ))}
              {reproSlots.length === 0 && <span style={{ fontSize: 11, color: C.textMuted }}>Aucun créneau sélectionné</span>}
            </div>

            {/* Liste des créneaux disponibles */}
            <div style={{ flex: 1, overflowY: "auto", marginBottom: 14, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              {loadingSlots ? (
                <div style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Chargement des créneaux...</div>
              ) : availableSlots.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Aucun créneau disponible dans les 14 prochains jours</div>
              ) : (
                (() => {
                  const byDate = availableSlots.reduce((acc, s) => { (acc[s.date] = acc[s.date] || []).push(s); return acc; }, {});
                  return Object.entries(byDate).map(([date, slots]) => (
                    <div key={date}>
                      <div style={{ padding: "8px 14px", background: C.bg, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px" }}>
                        {slots.map((s, i) => {
                          const key = `${s.date}_${s.start_time}`;
                          const selected = reproSlots.find(r => `${r.date}_${r.start_time}` === key);
                          const disabled = !selected && reproSlots.length >= 3;
                          return (
                            <button key={i} onClick={() => !disabled && toggleSlot(s)}
                              style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", border: `1px solid ${selected ? C.blue : C.border}`, background: selected ? `${C.blue}30` : C.bgCard, color: selected ? C.blue : disabled ? C.textMuted : C.ink, transition: "all 0.15s" }}>
                              {s.start_time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            {/* Message optionnel */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Message (optionnel)</label>
              <input value={reproMessage} onChange={e => setReproMessage(e.target.value)}
                placeholder="Ex: Choisissez le créneau qui vous convient le mieux..."
                style={{ width: "100%", padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.ink, outline: "none", fontFamily: "'Source Sans 3', sans-serif" }}/>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setReproModal(null)}
                style={{ flex: 1, padding: "11px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={handleAdvisorRepro} disabled={reproSlots.length < 2 || !!actionLoading}
                style={{ flex: 2, padding: "11px", background: reproSlots.length < 2 || !!actionLoading ? C.bgHover : `${C.blue}CC`, border: `1px solid ${C.blue}60`, borderRadius: 10, color: C.white, cursor: reproSlots.length < 2 || !!actionLoading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s" }}>
                {actionLoading ? "Envoi..." : `Proposer ${reproSlots.length} créneau${reproSlots.length > 1 ? "x" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal annulation conseiller */}
      {cancelModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(27,37,56,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)" }}
          onClick={() => { setCancelModal(null); setCancelReason(""); }}>
          <div
            style={{ background: C.bgCard, border: `1px solid ${C.orange}50`, borderRadius: 20, padding: 30, width: 480, boxShadow: "0 20px 50px rgba(27,37,56,0.16)", animation: "fadeUp 0.25s ease" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>⚠️ Annuler le rendez-vous</h3>
                <p style={{ fontSize: 12, color: C.textMuted }}>
                  Client : <strong style={{ color: C.ink }}>{cancelModal.clientName}</strong>
                  {" — "}{fmtDate(cancelModal.date)} à {cancelModal.startTime}
                </p>
              </div>
              <button onClick={() => { setCancelModal(null); setCancelReason(""); }}
                style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }}>
                <IcoX/>
              </button>
            </div>

            <div style={{ background: `${C.orange}12`, border: `1px solid ${C.orange}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: C.orange, lineHeight: 1.6 }}>
              Le client sera notifié immédiatement et pourra soumettre une nouvelle demande de RDV.
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Motif de l'annulation *
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ex: Réunion urgente imprévue. Nous vous contacterons pour fixer un nouveau créneau..."
                rows={4}
                autoFocus
                style={{ width: "100%", padding: "12px 14px", background: C.bg, border: `1.5px solid ${cancelReason.trim() ? C.border : C.orange + "60"}`, borderRadius: 10, fontSize: 13, color: C.ink, outline: "none", resize: "vertical", fontFamily: "'Source Sans 3', sans-serif", lineHeight: 1.5 }}
              />
              <div style={{ fontSize: 11, color: cancelReason.trim() ? C.textMuted : C.orange, marginTop: 5 }}>
                {cancelReason.trim() ? `${cancelReason.length} caractères` : "Ce champ est requis — le client recevra ce motif"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setCancelModal(null); setCancelReason(""); }}
                style={{ flex: 1, padding: "12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Retour
              </button>
              <button
                onClick={handleAdvisorCancel}
                disabled={!cancelReason.trim() || !!actionLoading}
                style={{ flex: 2, padding: "12px", background: (!cancelReason.trim() || !!actionLoading) ? C.bgHover : `${C.orange}CC`, border: `1px solid ${C.orange}60`, borderRadius: 10, color: C.white, cursor: (!cancelReason.trim() || !!actionLoading) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.2s" }}>
                {actionLoading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                    Traitement...
                  </span>
                ) : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════
function Dashboard({ token, apiUrl, onLogout, onBackToChat, onGoEvaluations, onGoSessions }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingStats, setLS] = useState(true);
  const [loadingUsers, setLU] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelected] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [activeTab, setActiveTab] = useState("clients");
  const PER_PAGE = 10;

  const headers = { Authorization: `Bearer ${token}` };

  // Détection globale des 401 → déconnexion automatique
  const safeFetch = async (url, opts = {}) => {
    const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      onLogout();
    }
    return res;
  };

  const fetchStats = async () => {
    setLS(true);
    try {
      const [mainRes, rdvRes] = await Promise.all([
        safeFetch(`${apiUrl}/admin/stats`),
        safeFetch(`${apiUrl}/api/admin/appointments/stats`),
      ]);
      const mainData = mainRes.ok ? await mainRes.json() : {};
      const rdvData = rdvRes.ok ? await rdvRes.json() : {};
      setStats({ ...mainData, pending_rdv: rdvData.pending ?? 0 });
    } catch {} finally { setLS(false); }
  };

  const fetchUsers = async () => {
    setLU(true);
    try {
      const r = await safeFetch(`${apiUrl}/admin/users`);
      if (r.ok) setUsers((await r.json()).users || []);
    } catch {} finally { setLU(false); }
  };

  useEffect(() => { fetchStats(); fetchUsers(); }, []);

  const deleteUser = async (userId) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    await safeFetch(`${apiUrl}/admin/users/${userId}`, { method: "DELETE" });
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const filtered = users.filter(u => `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Source Sans 3', sans-serif", color: C.ink }}>
      <style>{`
        ${FONT}
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
      `}</style>

      <header style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: "0 28px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onBackToChat && (
            <button onClick={onBackToChat} style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}35`, borderRadius: 8, padding: "6px 12px", color: C.ink, cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              ← Chat
            </button>
          )}
          <Logo/>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: `${C.gold}14`, border: `1px solid ${C.gold}30`, borderRadius: 20, padding: "5px 12px" }}>
            <span style={{ color: C.gold }}><IcoShield/></span>
            <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>Administrateur</span>
          </div>
          {onGoEvaluations && (
            <button onClick={onGoEvaluations} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.30)", borderRadius: 9, padding: "7px 13px", color: "#7C3AED", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              🛡️ Évaluations
            </button>
          )}
          {onGoSessions && (
            <button onClick={onGoSessions} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.28)", borderRadius: 9, padding: "7px 13px", color: "#2563EB", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              🌐 Sessions
            </button>
          )}
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, background: `${C.red}15`, border: `1px solid ${C.red}30`, borderRadius: 9, padding: "7px 13px", color: "#ff8080", cursor: "pointer", fontSize: 12 }}>
            <IcoLogout/> Déconnexion
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ marginBottom: 32, animation: "fadeIn 0.4s ease" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.ink, fontFamily: "'Playfair Display', serif", marginBottom: 5 }}>Tableau de bord</h1>
          <p style={{ fontSize: 13, color: C.textMuted }}>Vue d'ensemble de l'activité Attijari Bank Assistant</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 28, animation: "fadeIn 0.4s ease 0.1s both" }}>
          <StatCard icon={<IcoUsers/>} label="Utilisateurs inscrits" value={loadingStats ? "..." : stats?.total_users} sub="Total comptes" color={C.red}/>
          <StatCard icon={<IcoChat/>} label="Conversations" value={loadingStats ? "..." : stats?.total_conversations} sub="Toutes sessions" color={C.accent}/>
          <StatCard icon={<IcoMsg/>} label="Messages échangés" value={loadingStats ? "..." : stats?.total_messages} sub="Questions & réponses" color={C.gold}/>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4 }}>
          {[
            { id: "clients", label: "Clients & Synthèses IA", icon: <IcoClient/> },
            { id: "rdv", label: "Demandes RDV", icon: <IcoCalendar/>, badge: stats?.pending_rdv },
            { id: "users", label: "Utilisateurs", icon: <IcoUsers/> },
            { id: "pdfs", label: "PDFs partagés", icon: <IcoPdf/> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: "10px 16px", background: activeTab === tab.id ? `linear-gradient(135deg, ${C.accent}, ${C.red})` : "transparent", border: "none", borderRadius: 9, color: activeTab === tab.id ? C.white : C.textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", position: "relative" }}>
              {tab.icon} {tab.label}
              {tab.badge > 0 && (
                <span style={{ background: C.orange, color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 20, lineHeight: 1.4 }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "clients" && <ClientsTable token={token} apiUrl={apiUrl}/>}
        {activeTab === "rdv" && <AppointmentsTab token={token} apiUrl={apiUrl}/>}

        {activeTab === "users" && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", animation: "fadeIn 0.4s ease" }}>
            <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Utilisateurs</h2>
                <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{filtered.length} compte{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 13px", minWidth: 220 }}>
                <span style={{ color: C.textMuted }}><IcoSearch/></span>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Rechercher..." style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: C.ink, width: "100%" }}/>
              </div>
              <button onClick={() => { fetchStats(); fetchUsers(); }} style={{ padding: "7px 14px", background: `${C.red}18`, border: `1px solid ${C.red}30`, borderRadius: 9, color: C.red, cursor: "pointer", fontSize: 12 }}>↻ Rafraîchir</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Utilisateur", "Email", "Email 2FA", "Statut 2FA", "Téléphone", "Inscrit le", "Actions"].map(h => (
                      <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Chargement...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Aucun utilisateur</td></tr>
                  ) : paginated.map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}20` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "13px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}70, ${C.red}70)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 11, fontWeight: 700 }}>{`${u.prenom?.[0]||""}${u.nom?.[0]||""}`.toUpperCase()}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{u.prenom} {u.nom}</div>
                        </div>
                      </td>
                      <td style={{ padding: "13px 18px", fontSize: 13, color: C.textSecondary }}>{u.email}</td>
                      <td style={{ padding: "13px 18px", fontSize: 12, color: u.two_fa_email ? C.ink : C.textMuted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.two_fa_email || <span style={{ fontStyle: "italic" }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 18px" }}>
                        {u.two_fa_email_status === "custom"
                          ? <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}50` }}>Custom</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: `${C.textMuted}18`, color: C.textMuted, border: `1px solid ${C.border}` }}>Fallback</span>
                        }
                      </td>
                      <td style={{ padding: "13px 18px", fontSize: 13, color: C.textMuted }}>{u.telephone || "—"}</td>
                      <td style={{ padding: "13px 18px", fontSize: 12, color: C.textMuted }}>{fmtDate(u.created_at)}</td>
                      <td style={{ padding: "13px 18px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setSelected(u)} style={{ padding: "5px 10px", background: `${C.red}12`, border: `1px solid ${C.red}25`, borderRadius: 7, color: "#ff8080", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><IcoEye/> Voir</button>
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Gérer l'email 2FA"
                            style={{ padding: "5px 8px", background: `${C.accent}12`, border: `1px solid ${C.accent}30`, borderRadius: 7, color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", fontSize: 13 }}>
                            ✏️
                          </button>
                          <button onClick={() => deleteUser(u.id)} style={{ padding: "5px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 7, color: C.textMuted, cursor: "pointer", display: "flex" }}><IcoTrash/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "pdfs" && <SharedPdfsTable token={token} apiUrl={apiUrl}/>}
      </div>

      {selectedUser && <UserModal user={selectedUser} token={token} apiUrl={apiUrl} onClose={() => setSelected(null)} onDelete={deleteUser}/>}
      {editingUser && (
        <TwoFAEmailModal
          user={editingUser}
          token={token}
          apiUrl={apiUrl}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminDashboard({ user, token, onLogout, onBackToChat, onGoEvaluations, onGoSessions }) {
  return <Dashboard token={token} apiUrl="" onLogout={onLogout} onBackToChat={onBackToChat} onGoEvaluations={onGoEvaluations} onGoSessions={onGoSessions}/>;
}