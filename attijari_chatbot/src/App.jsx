import { useState, useRef, useEffect } from "react";
import { LoginPage, RegisterPage } from "./AuthPages";
import AdminDashboard from "./Admindashboard";
import AdminEvaluations from "./pages/AdminEvaluations";
import AdminSessions from "./pages/AdminSessions";
import PrendreRDV from './pages/PrendreRDV';
import MesRDV from './pages/MesRDV';
import Verify2FA from './pages/Verify2FA';
import ReportNotMe from './pages/ReportNotMe';
import ResetPasswordRequired from './pages/ResetPasswordRequired';


const API_URL = "";

const C = {
  red: "#CC0000", redDark: "#A00000", redDeep: "#7A0000", redLight: "#E8000010",
  white: "#FFFFFF", offWhite: "#F8F7F5", charcoal: "#1A1A1A", darkGray: "#3D3D3D",
  midGray: "#757575", lightGray: "#E8E4DF", borderGray: "#D8D4CE", gold: "#B8964A",
  blue: "#2563EB", blueLight: "#EFF6FF",
  purple: "#7C3AED", purpleLight: "#F5F3FF", purpleDark: "#5B21B6",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`;

const SUGGESTIONS = [
  "Quelles cartes bancaires proposez-vous ?",
  "Je veux construire une maison",
  "Épargner pour mes enfants",
  "Étapes migration Attijari UP",
  "Crédit pour acheter une voiture",
  "Ouvrir un compte",
];

const CLIENT_SUGGESTIONS = [
  "Propose-moi 3 produits adaptés pour ce client",
  "Quel est son taux d'endettement actuel ?",
  "Peut-il obtenir un crédit consommation ?",
  "Quelles sont ses dernières transactions ?",
  "Résume son profil en 3 points clés",
];

// Icons
const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const MicIcon = ({ recording }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="11" rx="3" fill={recording ? "white" : "currentColor"} /><path d="M5 10a7 7 0 0 0 14 0" stroke={recording ? "white" : "currentColor"} strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="17" x2="12" y2="21" stroke={recording ? "white" : "currentColor"} strokeWidth="2" strokeLinecap="round" /><line x1="9" y1="21" x2="15" y2="21" stroke={recording ? "white" : "currentColor"} strokeWidth="2" strokeLinecap="round" /></svg>;
const LogoutIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const NewChatIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const PaperclipIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const PdfIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const XIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
const LibraryIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v14M4 19.5a2.5 2.5 0 0 0 2.5 2.5H20v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const BellIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ClientIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 21v-1a7 7 0 0 1 14 0v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const ChevronDown = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const AttijariLogo = () => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <div style={{ background: "white", borderRadius: 10, padding: "5px 12px", display: "flex", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
      <img src="/attijari-logo.png" alt="Attijari Bank" style={{ height: 30, display: "block" }} />
    </div>
  </div>
);

const BotAvatar = () => (
  <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.white, fontSize: 14, fontWeight: 700, fontFamily: "'Source Sans 3', sans-serif", letterSpacing: "-0.02em" }}>A</div>
);

const UserAvatar = ({ user }) => (
  <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.charcoal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.white, fontSize: 12, fontWeight: 600, fontFamily: "'Source Sans 3', sans-serif" }}>
    {user ? `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase() : "U"}
  </div>
);

// ═══ CLIENT SELECTOR DROPDOWN ═══
function ClientSelector({ token, activeClient, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    fetch(`${API_URL}/admin/clients?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { clients: [] })
      .then(d => setClients(d.clients || []))
      .finally(() => setLoading(false));
  }, [open, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (client) => {
    onSelect(client);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: activeClient ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.15)",
          border: `1px solid ${activeClient ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.25)"}`,
          borderRadius: 20, padding: "4px 12px",
          color: C.white, cursor: "pointer",
          fontSize: 11, fontFamily: "'Source Sans 3', sans-serif",
          fontWeight: 600, transition: "all 0.2s",
        }}>
        <ClientIcon/>
        <span>{activeClient ? `${activeClient.prenom} ${activeClient.nom}` : "Sélectionner client"}</span>
        <ChevronDown/>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 6,
          width: 340, background: C.white, borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          border: `1px solid ${C.borderGray}`,
          zIndex: 1000, overflow: "hidden",
          animation: "fadeUp 0.2s ease",
          fontFamily: "'Source Sans 3', sans-serif",
        }}>
          {/* Search */}
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.lightGray}` }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              style={{ width: "100%", padding: "8px 12px", background: C.offWhite, border: `1px solid ${C.borderGray}`, borderRadius: 8, fontSize: 13, fontFamily: "'Source Sans 3', sans-serif", outline: "none", color: C.charcoal }}/>
          </div>

          {/* Current active client */}
          {activeClient && (
            <div style={{ padding: "10px 14px", background: C.purpleLight, borderBottom: `1px solid ${C.lightGray}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: C.purpleDark, fontWeight: 600 }}>
                ✓ Client actif: {activeClient.prenom} {activeClient.nom}
              </div>
              <button onClick={() => { onClear(); setOpen(false); }}
                style={{ background: "none", border: "none", color: C.purple, cursor: "pointer", fontSize: 11, fontWeight: 600, padding: 0 }}>
                Désactiver
              </button>
            </div>
          )}

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: C.midGray, fontSize: 12 }}>Chargement...</div>
            ) : clients.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.midGray, fontSize: 12 }}>Aucun client trouvé</div>
            ) : clients.map(c => {
              const isActive = activeClient?.id === c.id;
              return (
                <button key={c.id} onClick={() => handleSelect(c)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: isActive ? C.purpleLight : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    borderBottom: `1px solid ${C.lightGray}40`,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.offWhite; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {`${c.prenom?.[0]||""}${c.nom?.[0]||""}`.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.prenom} {c.nom}
                    </div>
                    <div style={{ fontSize: 10, color: C.midGray, marginTop: 2, textTransform: "capitalize" }}>
                      {c.profession} · {c.revenus_mensuels} DT · {c.ville}
                    </div>
                  </div>
                  {isActive && <span style={{ color: C.purple, fontSize: 14 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ TOAST ═══
function Toast({ message, onClose, onAction }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div style={{ position: "fixed", top: 80, right: 20, zIndex: 2000, background: C.white, border: `1px solid ${C.gold}60`, borderLeft: `4px solid ${C.gold}`, borderRadius: 12, padding: "14px 18px", boxShadow: "0 10px 40px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 14, maxWidth: 380, animation: "slideInRight 0.35s ease", fontFamily: "'Source Sans 3', sans-serif" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.gold}20`, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, flexShrink: 0 }}><BellIcon/></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal, marginBottom: 2 }}>🔔 Nouveaux documents</div>
        <div style={{ fontSize: 12, color: C.midGray, lineHeight: 1.4 }}>{message}</div>
        {onAction && <button onClick={onAction} style={{ marginTop: 8, background: "none", border: "none", color: C.gold, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>Voir la bibliothèque →</button>}
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.midGray, padding: 2, display: "flex" }}><XIcon/></button>
    </div>
  );
}

// ═══ LIBRARY MODAL ═══
function LibraryModal({ token, onClose, onSelectPdf }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_URL}/shared_pdfs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { pdfs: [] })
      .then(d => setPdfs(d.pdfs || []))
      .finally(() => setLoading(false));
  }, []);
  const handleSelect = async (pdf) => {
    try { await fetch(`${API_URL}/shared_pdfs/${pdf.pdf_id}/mark_viewed`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch {}
    onSelectPdf(pdf); onClose();
  };
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1500, backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 16, padding: 24, width: 520, maxHeight: "80vh", overflow: "auto", fontFamily: "'Source Sans 3', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.charcoal, marginBottom: 3 }}>📚 Bibliothèque partagée</h2>
            <p style={{ fontSize: 12, color: C.midGray }}>Documents partagés par l'équipe Attijari</p>
          </div>
          <button onClick={onClose} style={{ background: C.offWhite, border: `1px solid ${C.borderGray}`, borderRadius: 8, padding: 6, cursor: "pointer", color: C.midGray, display: "flex" }}><XIcon/></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? <div style={{ padding: 40, textAlign: "center", color: C.midGray, fontSize: 13 }}>Chargement...</div>
          : pdfs.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.midGray, fontSize: 13, background: C.offWhite, borderRadius: 10 }}>📭 Aucun document partagé.</div>
          : pdfs.map(pdf => (
            <button key={pdf.pdf_id} onClick={() => handleSelect(pdf)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: pdf.is_new ? "#FFF9EE" : C.white, border: pdf.is_new ? `1.5px solid ${C.gold}60` : `1px solid ${C.borderGray}`, borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${C.gold}, #9A7A2E)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, flexShrink: 0 }}><PdfIcon/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pdf.file_name}</span>
                  {pdf.is_new && <span style={{ background: C.red, color: C.white, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Nouveau</span>}
                </div>
                {pdf.description && <div style={{ fontSize: 12, color: C.darkGray, marginBottom: 4 }}>{pdf.description}</div>}
                <div style={{ fontSize: 11, color: C.midGray }}>📤 {pdf.uploaded_by} · 📄 {pdf.num_pages}p · {fmtDate(pdf.uploaded_at)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ SCORE BADGE ═══
function ScoreBadge({ evalId, autoScore }) {
  if (!evalId || !autoScore || typeof autoScore.score_global !== "number") return null;
  const score10 = Math.max(0, Math.min(10, autoScore.score_global));
  const stars   = Math.round((score10 / 2) * 2) / 2; // 0-5, step 0.5
  const filled  = Math.floor(stars);
  const hasHalf = stars - filled >= 0.5;
  const color   = score10 >= 7.5 ? "#16A34A" : score10 >= 5 ? "#D97706" : "#DC2626";
  const label   = score10 >= 7.5 ? "Fiabilité élevée" : score10 >= 5 ? "Fiabilité moyenne" : "Fiabilité faible";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 6, borderTop: "1px solid #F0EDEA", flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Fiabilité</span>
      <div style={{ display: "flex", gap: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ fontSize: 15, lineHeight: 1, color: i <= filled || (i === filled + 1 && hasHalf) ? "#FBBF24" : "#D1D5DB" }}>
            {i <= filled ? "★" : (i === filled + 1 && hasHalf ? "⯨" : "☆")}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{stars.toFixed(1)}/5</span>
      <span style={{ fontSize: 10, color: "#D1D5DB" }}>·</span>
      <span style={{ fontSize: 10, color, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ═══ FEEDBACK ROW ═══
function FeedbackRow({ evalId, token }) {
  const [voted, setVoted] = useState(null);      // null | "up" | "down"
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [comment, setComment] = useState("");
  const [modalErr, setModalErr] = useState(null);
  const [modalSending, setModalSending] = useState(false);

  if (!evalId) return null;

  const submitFeedback = async (rating, issue = null, cmt = null) => {
    setSending(true);
    try {
      await fetch(`http://localhost:8000/api/evaluations/${evalId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, issue_type: issue, comment: cmt }),
      });
      setVoted(rating);
      setFlash(rating === "up" ? "Merci pour votre retour ! 👍" : "Merci, votre signalement nous aide !");
      setTimeout(() => setFlash(null), 4000);
    } catch {
      setFlash("Erreur lors de l'envoi.");
      setTimeout(() => setFlash(null), 4000);
    } finally { setSending(false); }
  };

  const handleDown = () => { if (!voted && !sending) setShowModal(true); };

  const handleModalSubmit = async () => {
    if (!issueType) { setModalErr("Sélectionnez un type de problème."); return; }
    setModalSending(true); setModalErr(null);
    await submitFeedback("down", issueType, comment.trim() || null);
    setShowModal(false); setIssueType(""); setComment(""); setModalSending(false);
  };

  const btnBase = { display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: voted ? "default" : "pointer", transition: "all 0.2s", border: "1.5px solid" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>Cette réponse vous a-t-elle aidé ?</span>

        <button disabled={!!voted || sending} onClick={() => !voted && !sending && submitFeedback("up")}
          style={{ ...btnBase,
            background: voted === "up" ? "#D1FAE5" : "#F9FAFB",
            color:      voted === "up" ? "#047857" : voted ? "#9CA3AF" : "#4B5563",
            borderColor: voted === "up" ? "#86EFAC" : "#E5E7EB",
          }}>
          👍 Oui
        </button>

        <button disabled={!!voted || sending} onClick={handleDown}
          style={{ ...btnBase,
            background: voted === "down" ? "#FEE2E2" : "#F9FAFB",
            color:      voted === "down" ? "#B91C1C" : voted ? "#9CA3AF" : "#4B5563",
            borderColor: voted === "down" ? "#FCA5A5" : "#E5E7EB",
          }}>
          👎 Non
        </button>

        {flash && <span style={{ fontSize: 11, color: "#059669" }}>{flash}</span>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", fontFamily: "'Source Sans 3', sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1F2937" }}>⚠️ Signaler un problème</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF" }}>✕</button>
            </div>
            {[
              { id: "incorrect",  label: "❌ Information incorrecte" },
              { id: "incomplete", label: "📝 Réponse incomplète" },
              { id: "irrelevant", label: "🎯 Hors-sujet" },
              { id: "other",      label: "💬 Autre problème" },
            ].map(t => (
              <button key={t.id} onClick={() => setIssueType(t.id)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 6, borderRadius: 8, border: `2px solid ${issueType === t.id ? "#EF4444" : "#E5E7EB"}`, background: issueType === t.id ? "#FEF2F2" : "#fff", cursor: "pointer", fontSize: 13, color: issueType === t.id ? "#B91C1C" : "#374151", fontWeight: issueType === t.id ? 600 : 400 }}>
                {t.label}
              </button>
            ))}
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} maxLength={500}
              placeholder="Commentaire optionnel..."
              style={{ width: "100%", marginTop: 8, padding: 10, border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
            {modalErr && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 6 }}>{modalErr}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: "9px 0", border: "1.5px solid #E5E7EB", borderRadius: 8, background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={handleModalSubmit} disabled={modalSending}
                style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, background: modalSending ? "#FCA5A5" : "#DC2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: modalSending ? "not-allowed" : "pointer" }}>
                {modalSending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══ MESSAGE ═══
function Message({ msg, user, token = null }) {
  const isUser = msg.role === "user";
  const handleSpeak = () => {
    const clean = msg.content.replace(/\*\*(.*?)\*\*/g, "$1").replace(/#{1,6}\s/g, "").substring(0, 800);
    const u = new SpeechSynthesisUtterance(clean); u.lang = "fr-FR";
    const frVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith("fr"));
    if (frVoice) u.voice = frVoice;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  };
  return (
    <div style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start", gap: 10, marginBottom: 18, animation: "slideIn 0.3s ease" }}>
      {isUser ? <UserAvatar user={user} /> : <BotAvatar />}
      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: C.midGray, textAlign: isUser ? "right" : "left", textTransform: "uppercase" }}>
          {isUser ? (user ? `${user.prenom} ${user.nom}` : "Vous") : "Attijari Bank"}
        </div>
        <div style={{ background: isUser ? `linear-gradient(135deg, ${C.charcoal}, ${C.darkGray})` : C.white, color: isUser ? C.white : C.charcoal, padding: "12px 16px", borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "'Source Sans 3', sans-serif", boxShadow: isUser ? "0 4px 16px rgba(0,0,0,0.18)" : "0 2px 10px rgba(0,0,0,0.07)", border: isUser ? "none" : `1px solid ${C.lightGray}` }}>
          {msg.content}
          {msg.streaming && <span style={{ display: "inline-block", width: 2, height: 13, background: C.red, marginLeft: 2, verticalAlign: "middle", animation: "blink 0.8s ease-in-out infinite" }} />}
        </div>
        {msg.sources?.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Sources</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {msg.sources.map((s, i) => (
                <a key={i} href={s.url && s.url !== "#" && s.url !== "#pdf" ? s.url : undefined} target="_blank" rel="noopener noreferrer"
                  style={{ background: s.url === "#pdf" ? "#FEF3E2" : C.redLight, border: s.url === "#pdf" ? `1px solid ${C.gold}60` : `1px solid ${C.red}40`, color: s.url === "#pdf" ? "#9A7A2E" : C.red, fontSize: 10, padding: "3px 10px", borderRadius: 20, textDecoration: "none", fontFamily: "'Source Sans 3', sans-serif", cursor: s.url && s.url !== "#" && s.url !== "#pdf" ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {s.title || "Source"}
                </a>
              ))}
            </div>
          </div>
        )}
        {!isUser && msg.model && !msg.streaming && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            {msg.model.startsWith("gemini") ? (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8",
                display: "inline-flex", alignItems: "center", gap: 3 }}>
                ✦ Gemini
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D",
                display: "inline-flex", alignItems: "center", gap: 3 }}>
                ⚡ Groq
              </span>
            )}
          </div>
        )}
        {!isUser && msg.content && !msg.streaming && (
          <button onClick={handleSpeak} style={{ alignSelf: "flex-start", background: "none", border: `1px solid ${C.borderGray}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, color: C.midGray, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif" }}>
            🔊 Écouter
          </button>
        )}
        {!isUser && msg.eval_id && (
          <>
            <ScoreBadge evalId={msg.eval_id} autoScore={msg.auto_score} />
            <FeedbackRow evalId={msg.eval_id} token={token} />
          </>
        )}
      </div>
    </div>
  );
}

// ═══ SIDEBAR ═══
function Sidebar({ token, currentConvId, onSelectConversation, onNewChat, isOpen, refreshTrigger }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/history/list`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setConversations(data.conversations || []); }
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { if (isOpen) fetchConversations(); }, [isOpen, refreshTrigger]);
  const deleteConv = async (e, id) => {
    e.stopPropagation();
    await fetch(`${API_URL}/history/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConversations(prev => prev.filter(c => c.id !== id));
  };
  const formatDate = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "";
  if (!isOpen) return null;
  return (
    <div style={{ width: 260, background: C.offWhite, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.borderGray}`, flexShrink: 0 }}>
      <div style={{ padding: "16px 14px", borderBottom: `1px solid ${C.borderGray}` }}>
        <button onClick={onNewChat} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, #E8521A, ${C.red})`, border: "none", borderRadius: 10, padding: "10px 14px", color: C.white, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <NewChatIcon /> Nouvelle conversation
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 6px 6px", fontWeight: 600 }}>Historique</div>
        {loading && <div style={{ color: C.midGray, fontSize: 12, textAlign: "center", padding: 20 }}>Chargement...</div>}
        {!loading && conversations.length === 0 && <div style={{ color: C.midGray, fontSize: 12, textAlign: "center", padding: "24px 12px" }}>Aucune conversation<br />sauvegardée</div>}
        {conversations.map(conv => (
          <div key={conv.id} onClick={() => onSelectConversation(conv.id)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: currentConvId === conv.id ? C.white : "transparent", border: currentConvId === conv.id ? `1px solid ${C.red}30` : "1px solid transparent" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: currentConvId === conv.id ? C.red : C.charcoal, fontWeight: currentConvId === conv.id ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{conv.title || "Conversation"}</div>
              <div style={{ fontSize: 10, color: C.midGray, marginTop: 2 }}>{formatDate(conv.updated_at)} · {conv.message_count} messages</div>
            </div>
            <button onClick={(e) => deleteConv(e, conv.id)} style={{ background: "none", border: "none", color: C.midGray, cursor: "pointer", padding: 4, display: "flex" }}><TrashIcon /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ DATASET SELECTOR ═══
const DATASETS = [
  { id: "particulier", label: "Particulier", icon: "👤", description: "Offres packagées, cartes bancaires, crédits, épargne et placements, assurance, banque à distance." },
  { id: "professionnel", label: "Professionnel libéral", icon: "💼", description: "Services bancaires dédiés aux professions libérales : comptes, financements et solutions adaptées." },
];

function DatasetSelector({ user, onSelect, onLogout, onGoAdmin }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.offWhite, overflow: "hidden", fontFamily: "'Source Sans 3', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <header style={{ background: "linear-gradient(110deg, #F5A623 0%, #E8521A 45%, #CC0000 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 60 }}>
          <AttijariLogo />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user.is_admin && onGoAdmin && (
              <button onClick={onGoAdmin} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(184,150,74,0.25)", border: "1px solid rgba(184,150,74,0.5)", borderRadius: 8, padding: "6px 12px", color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🛡️ Admin</button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 24, padding: "5px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80" }} />
              <span style={{ color: C.white, fontSize: 12, fontWeight: 500 }}>{user.prenom} {user.nom}</span>
            </div>
            <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 12px", color: C.white, cursor: "pointer", fontSize: 12 }}><LogoutIcon /> Déconnexion</button>
          </div>
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.red, marginBottom: 10 }}>📊 Sélectionnez votre espace</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.charcoal, marginBottom: 8 }}>Bonjour {user.prenom}, comment puis-je vous aider ?</div>
          <div style={{ fontSize: 14, color: C.midGray }}>Choisissez le service adapté à vos besoins</div>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          {DATASETS.map(ds => (
            <button key={ds.id} onClick={() => onSelect(ds.id)} onMouseEnter={() => setHovered(ds.id)} onMouseLeave={() => setHovered(null)}
              style={{ width: 240, padding: "32px 28px", background: C.white, border: `2px solid ${hovered === ds.id ? C.red : C.borderGray}`, borderRadius: 16, cursor: "pointer", textAlign: "left", transition: "all 0.2s", transform: hovered === ds.id ? "translateY(-3px)" : "none" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{ds.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: hovered === ds.id ? C.red : C.charcoal, marginBottom: 10 }}>{ds.label}</div>
              <div style={{ fontSize: 13, color: C.midGray, lineHeight: 1.6 }}>{ds.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ CHATBOT ═══
function ChatBot({
  user,
  token,
  onLogout,
  dataset,
  onChangeDataset,
  onGoAdmin,
  onGoPrendreRDV,
  onGoMesRDV,
}) {
  const [messages, setMessages] = useState([{ role: "assistant", content: `Bonjour ${user.prenom} ! Je suis votre conseiller bancaire Attijari Bank.\n\nComment puis-je vous aider aujourd'hui ?`, sources: [] }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentConvId, _setCurrentConvId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [language, setLanguage] = useState("french");

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const fileInputRef = useRef(null);

  const [sharedPdf, setSharedPdf] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  // ━━━ NOUVEAU: CLIENT ACTIF ━━━
  const [activeClient, setActiveClient] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const currentConvIdRef = useRef(null);

  const setCurrentConvId = (id) => {
    _setCurrentConvId(id);
    currentConvIdRef.current = id;
    if (id) localStorage.setItem("currentConvId", id);
    else localStorage.removeItem("currentConvId");
  };

  useEffect(() => { currentConvIdRef.current = currentConvId; }, [currentConvId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await fetch(`${API_URL}/shared_pdfs/unread_count`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count || 0);
          const toastShown = sessionStorage.getItem("toast_shown_shared");
          if (data.unread_count > 0 && !toastShown) {
            setToast({ message: data.unread_count === 1 ? "Vous avez 1 nouveau document partagé." : `Vous avez ${data.unread_count} nouveaux documents partagés.` });
            sessionStorage.setItem("toast_shown_shared", "true");
          }
        }
      } catch {}
    };
    checkUnread();
  }, [token]);

  // ━━━ CLIENT HANDLERS ━━━
  const selectClient = (client) => {
    setActiveClient(client);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `📋 **Client actif: ${client.prenom} ${client.nom}** (${client.profession}, ${client.age} ans)\n\nJe dispose maintenant de ses données (profil, revenus, produits, transactions). Posez-moi des questions précises sur ce client pour votre rendez-vous.`,
      sources: [],
    }]);
  };

  const clearClient = () => {
    if (!activeClient) return;
    setMessages(prev => [...prev, {
      role: "assistant",
      content: `📋 Client désactivé. Reprise du mode normal.`,
      sources: [],
    }]);
    setActiveClient(null);
  };

  // PDF handlers
  const triggerFilePicker = () => { if (pdfUploading || loading) return; fileInputRef.current?.click(); };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.name.toLowerCase().endsWith(".pdf")) { setPdfError("Veuillez sélectionner un fichier PDF."); return; }
    if (file.size > 20 * 1024 * 1024) { setPdfError("PDF trop volumineux (max 20 MB)."); return; }
    setPdfUploading(true); setPdfError(null);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`${API_URL}/upload_pdf`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Erreur"); }
      const data = await res.json();
      setPdfFile({ sessionId: data.pdf_session_id, fileName: file.name, numPages: data.num_pages, numChunks: data.num_chunks });
      setSharedPdf(null);
      setMessages(prev => [...prev, { role: "assistant", content: `📄 PDF "${file.name}" chargé (${data.num_pages}p).`, sources: [] }]);
    } catch (err) { setPdfError(err.message); }
    finally { setPdfUploading(false); }
  };

  const removePdf = async () => {
    if (!pdfFile) return;
    const sessionId = pdfFile.sessionId;
    setPdfFile(null); setPdfError(null);
    try { await fetch(`${API_URL}/upload_pdf/${sessionId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch {}
    setMessages(prev => [...prev, { role: "assistant", content: "📄 PDF retiré.", sources: [] }]);
  };

  const selectSharedPdf = (pdf) => {
    setPdfFile(null);
    setSharedPdf({ pdfId: pdf.pdf_id, fileName: pdf.file_name, numPages: pdf.num_pages, uploadedBy: pdf.uploaded_by });
    setMessages(prev => [...prev, { role: "assistant", content: `📚 Document "${pdf.file_name}" de ${pdf.uploaded_by} activé.`, sources: [] }]);
  };

  const removeSharedPdf = () => {
    setSharedPdf(null);
    setMessages(prev => [...prev, { role: "assistant", content: "📚 Document partagé retiré.", sources: [] }]);
  };

  const saveConversation = async (allMessages) => {
    const messagesToSave = allMessages.filter(m => m.content && m.content.trim() !== "").map(m => {
      const msg = { role: m.role, content: m.content, sources: m.sources || [] };
      if (m.eval_id)    msg.eval_id    = m.eval_id;
      if (m.auto_score) msg.auto_score = m.auto_score;
      return msg;
    });
    const hasUser = messagesToSave.some(m => m.role === "user");
    const hasBot = messagesToSave.some(m => m.role === "assistant" && m.content.length > 10);
    if (!hasUser || !hasBot) return;
    setSaving(true);
    try {
      const convId = currentConvIdRef.current;
      if (convId) {
        await fetch(`${API_URL}/history/update/${convId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages: messagesToSave }) });
      } else {
        const res = await fetch(`${API_URL}/history/save`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ messages: messagesToSave }) });
        if (res.ok) { const data = await res.json(); setCurrentConvId(data.id); setRefreshTrigger(t => t + 1); }
      }
    } catch {} finally { setSaving(false); }
  };

  const loadConversation = async (convId) => {
    try {
      const res = await fetch(`${API_URL}/history/${convId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setMessages(data.messages); setCurrentConvId(convId); setPdfFile(null); setSharedPdf(null); setActiveClient(null); }
    } catch { }
  };

  useEffect(() => {
    const savedId = localStorage.getItem("currentConvId");
    if (savedId) loadConversation(savedId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const newChat = () => {
    setMessages([{ role: "assistant", content: `Bonjour ${user.prenom} ! Je suis votre conseiller bancaire Attijari Bank.\n\nComment puis-je vous aider aujourd'hui ?`, sources: [] }]);
    setCurrentConvId(null); setError(null);
  };

  const startRecording = async () => {
    if (recording || loading || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeAudio(blob);
      };
      mediaRecorder.start(250); setRecording(true);
    } catch { setError("Accès au microphone refusé."); }
  };
  const stopRecording = () => { if (mediaRecorderRef.current && recording) { mediaRecorderRef.current.stop(); setRecording(false); } };
  const transcribeAudio = async (blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch(`${API_URL}/transcribe`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.text?.trim()) await sendMessage(data.text.trim());
    } catch { setError("Erreur lors de la transcription."); }
    finally { setTranscribing(false); }
  };

  const sendMessage = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput(""); setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const newMessages = [...messages, { role: "user", content: userMsg, sources: [] }];
    setMessages(newMessages); setLoading(true);
    const assistantIndex = newMessages.length;
    let fullContent = ""; let finalSources = []; let finalEvalId = null; let finalAutoScore = null;
    setMessages(prev => [...prev, { role: "assistant", content: "", sources: [], streaming: true }]);

    try {
      const history = newMessages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const bodyPayload = { message: userMsg, history: history.slice(-6), segment: user.segment || "particulier", language, dataset };
      if (pdfFile?.sessionId) bodyPayload.pdf_session_id = pdfFile.sessionId;
      else if (sharedPdf?.pdfId) bodyPayload.shared_pdf_id = sharedPdf.pdfId;
      // ━━━ NOUVEAU: Ajouter client_id si client actif ━━━
      if (activeClient?.id) bodyPayload.client_id = activeClient.id;

      const res = await fetch(`${API_URL}/chat`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(bodyPayload) });
      if (!res.ok) throw new Error();
      setLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n"); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.replace("data: ", "").trim());
            if (event.type === "meta") {
              finalSources = event.sources || [];
              finalEvalId = event.eval_id || null;
              finalAutoScore = event.auto_score || null;
              setMessages(prev => { const u = [...prev]; u[assistantIndex] = { ...u[assistantIndex], sources: finalSources, eval_id: finalEvalId, auto_score: finalAutoScore, model: event.model || null }; return u; });
            } else if (event.type === "token") {
              fullContent += event.text;
              setMessages(prev => { const u = [...prev]; u[assistantIndex] = { ...u[assistantIndex], content: u[assistantIndex].content + event.text }; return u; });
            } else if (event.type === "done") {
              setMessages(prev => { const u = [...prev]; u[assistantIndex] = { ...u[assistantIndex], streaming: false }; return u; });
            }
          } catch { }
        }
      }
      await saveConversation([...newMessages, { role: "assistant", content: fullContent, sources: finalSources, eval_id: finalEvalId, auto_score: finalAutoScore }]);
    } catch {
      setLoading(false); setError("Impossible de joindre le serveur.");
      setMessages(prev => prev.filter((_, i) => i !== assistantIndex));
    }
    textareaRef.current?.focus();
  };

  const activeDoc = pdfFile || sharedPdf;
  const hasClientContext = !!activeClient;
  const showSuggestions = messages.length <= 1 && !activeDoc && !hasClientContext;
  const showClientSuggestions = hasClientContext && messages.length <= 2 && !loading;
  const canSend = !loading && input.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.offWhite, overflow: "hidden" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-5px); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulseBadge { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-thumb { background:#333; border-radius:3px; }
      `}</style>

      <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} style={{ display: "none" }} />
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} onAction={() => { setToast(null); setShowLibrary(true); }} />}
      {showLibrary && <LibraryModal token={token} onClose={() => setShowLibrary(false)} onSelectPdf={selectSharedPdf} />}

      <header style={{ background: "linear-gradient(110deg, #F5A623 0%, #E8521A 45%, #CC0000 100%)", flexShrink: 0, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(p => !p)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", color: C.white, cursor: "pointer", fontSize: 16 }}>☰</button>
            <AttijariLogo />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {saving && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>💾</span>}

            <button
              onClick={onGoPrendreRDV}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8, padding: "6px 12px",
                color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              📅 Prendre RDV
            </button>

            <button
              onClick={onGoMesRDV}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8, padding: "6px 12px",
                color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              📋 Mes RDV
            </button>

            {/* ━━━ CLIENT SELECTOR (admin only) ━━━ */}
            {user.is_admin && (
              <ClientSelector token={token} activeClient={activeClient} onSelect={selectClient} onClear={clearClient} />
            )}

            <button onClick={() => setShowLibrary(true)} title="Bibliothèque"
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, background: "rgba(184,150,74,0.22)", border: "1px solid rgba(184,150,74,0.45)", borderRadius: 8, padding: "6px 12px", color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              <LibraryIcon/>
              <span>Biblio</span>
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: C.red, color: C.white, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, border: `2px solid #E8521A`, animation: "pulseBadge 2s ease-in-out infinite", padding: "0 5px" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {user.is_admin && onGoAdmin && (
              <button onClick={onGoAdmin} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(184,150,74,0.22)", border: "1px solid rgba(184,150,74,0.45)", borderRadius: 8, padding: "6px 12px", color: C.white, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                🛡️ Admin
              </button>
            )}

            <button onClick={onChangeDataset} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "4px 12px", color: C.white, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
              {dataset === "professionnel" ? "💼" : "👤"} {dataset === "professionnel" ? "Pro" : "Particulier"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.2)", borderRadius: 20, padding: "4px 12px" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>FR</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>·</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>تونسي</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 24, padding: "5px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80" }} />
              <span style={{ color: C.white, fontSize: 12, fontWeight: 500 }}>{user.prenom} {user.nom}</span>
            </div>
            <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 12px", color: C.white, cursor: "pointer", fontSize: 12 }}>
              <LogoutIcon /> Déconnexion
            </button>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", padding: "5px 20px", background: "rgba(0,0,0,0.12)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Conseiller Bancaire Intelligent</span>
          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontStyle: "italic" }}>Service disponible 24h/24 · 7j/7</span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar token={token} currentConvId={currentConvId} onSelectConversation={loadConversation} onNewChat={newChat} isOpen={sidebarOpen} refreshTrigger={refreshTrigger} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 16px", display: "flex", flexDirection: "column" }}>
            {messages.map((msg, i) => <Message key={i} msg={msg} user={user} token={token} />)}

            {loading && (
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                <BotAvatar />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.midGray, textTransform: "uppercase", marginBottom: 6 }}>Attijari Bank</div>
                  <div style={{ background: C.white, border: `1px solid ${C.lightGray}`, borderRadius: "4px 14px 14px 14px", padding: "12px 16px", display: "flex", gap: 5 }}>
                    {[0, 0.18, 0.36].map((d, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, animation: `bounce 1.2s ease-in-out ${d}s infinite` }} />)}
                  </div>
                </div>
              </div>
            )}

            {error && <div style={{ background: "#FFF5F5", borderLeft: `3px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.redDark, marginBottom: 14, marginLeft: 44 }}>⚠️ {error}</div>}

            {showSuggestions && !loading && (
              <div style={{ marginTop: 8, marginLeft: 44 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ height: 1, width: 16, background: C.borderGray }} />
                  <span style={{ fontSize: 10, color: C.midGray, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Questions fréquentes</span>
                  <div style={{ height: 1, flex: 1, background: C.borderGray }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} style={{ background: C.white, border: `1.5px solid ${C.borderGray}`, borderRadius: 24, padding: "7px 14px", fontSize: 12, color: C.darkGray, cursor: "pointer" }}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* ━━━ SUGGESTIONS CONTEXTUELLES POUR CLIENT ACTIF ━━━ */}
            {showClientSuggestions && (
              <div style={{ marginTop: 8, marginLeft: 44 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ height: 1, width: 16, background: C.purple }} />
                  <span style={{ fontSize: 10, color: C.purple, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>💡 Questions pour ce client</span>
                  <div style={{ height: 1, flex: 1, background: C.purple, opacity: 0.3 }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {CLIENT_SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} style={{ background: C.purpleLight, border: `1.5px solid ${C.purple}50`, borderRadius: 24, padding: "7px 14px", fontSize: 12, color: C.purpleDark, cursor: "pointer", fontFamily: "'Source Sans 3', sans-serif", fontWeight: 500 }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ background: C.white, borderTop: `1px solid ${C.lightGray}`, padding: "14px 20px 18px", flexShrink: 0 }}>

            {/* ━━━ BADGE CLIENT ACTIF (VIOLET) ━━━ */}
            {activeClient && !pdfFile && !sharedPdf && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(90deg, #F5F3FF 0%, #FAF5FF 100%)", border: `1.5px solid ${C.purple}80`, borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontFamily: "'Source Sans 3', sans-serif" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, flexShrink: 0 }}>
                    <ClientIcon/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.charcoal }}>{activeClient.prenom} {activeClient.nom}</span>
                      <span style={{ background: C.purple, color: C.white, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>👤 CLIENT</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.midGray, marginTop: 1, textTransform: "capitalize" }}>
                      {activeClient.profession} · {activeClient.age} ans · {activeClient.revenus_mensuels} DT · <span style={{ color: "#2D8F2D", fontWeight: 600 }}>● Actif</span>
                    </div>
                  </div>
                </div>
                <button onClick={clearClient} style={{ background: "rgba(124,58,237,0.12)", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: C.purple, display: "flex" }}>
                  <XIcon />
                </button>
              </div>
            )}

            {pdfFile && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(90deg, #FEF3E2 0%, #FFF9EE 100%)", border: `1.5px solid ${C.gold}80`, borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.gold}, #9A7A2E)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, flexShrink: 0 }}><PdfIcon /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pdfFile.fileName}</div>
                    <div style={{ fontSize: 10, color: C.midGray, marginTop: 1 }}>{pdfFile.numPages}p · Mon document · <span style={{ color: "#2D8F2D", fontWeight: 600 }}>● Actif</span></div>
                  </div>
                </div>
                <button onClick={removePdf} style={{ background: "rgba(204,0,0,0.1)", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: C.red, display: "flex" }}><XIcon /></button>
              </div>
            )}

            {sharedPdf && !pdfFile && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(90deg, #EFF6FF 0%, #F8FBFF 100%)", border: `1.5px solid ${C.blue}60`, borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.blue}, #1E40AF)`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, flexShrink: 0 }}><PdfIcon /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sharedPdf.fileName}</span>
                      <span style={{ background: C.blue, color: C.white, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>📚 PARTAGÉ</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.midGray, marginTop: 1 }}>{sharedPdf.numPages}p · De {sharedPdf.uploadedBy}</div>
                  </div>
                </div>
                <button onClick={removeSharedPdf} style={{ background: "rgba(37,99,235,0.1)", border: "none", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: C.blue, display: "flex" }}><XIcon /></button>
              </div>
            )}

            {pdfError && (
              <div style={{ background: "#FFF5F5", borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", fontSize: 12, color: C.redDark, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>⚠️ {pdfError}</span>
                <button onClick={() => setPdfError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.redDark, display: "flex" }}><XIcon /></button>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: C.offWhite, border: `1.5px solid ${focused ? C.red : C.borderGray}`, borderRadius: 12, padding: "8px 8px 8px 16px", transition: "all 0.2s" }}>
              <textarea ref={textareaRef} value={transcribing ? "🎤 Transcription..." : input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                placeholder={
                  activeClient ? `Question sur ${activeClient.prenom} ${activeClient.nom}...`
                  : activeDoc ? "Question sur le document..."
                  : "Posez votre question en français ou en dialecte tunisien..."
                }
                rows={1} readOnly={transcribing}
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: transcribing ? C.midGray : C.charcoal, lineHeight: 1.6, resize: "none", fontFamily: "'Source Sans 3', sans-serif", outline: "none", maxHeight: 120, overflowY: "auto" }}
              />

              <button onClick={triggerFilePicker} disabled={pdfUploading || loading || transcribing} title="Joindre un PDF"
                style={{ width: 38, height: 38, borderRadius: 9, border: "none", background: pdfUploading ? C.gold : (pdfFile ? "#FEF3E2" : C.lightGray), cursor: pdfUploading || loading || transcribing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: pdfUploading ? C.white : (pdfFile ? C.gold : C.midGray) }}>
                {pdfUploading ? <div style={{ width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : <PaperclipIcon />}
              </button>

              <button onClick={recording ? stopRecording : startRecording} disabled={loading || transcribing}
                style={{ width: 38, height: 38, borderRadius: 9, border: "none", background: recording ? `linear-gradient(135deg, ${C.red}, ${C.redDark})` : transcribing ? C.gold : C.lightGray, cursor: loading || transcribing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: recording ? C.white : C.midGray, animation: recording ? "pulse 1s ease-in-out infinite" : "none" }}>
                {transcribing ? <span>⏳</span> : <MicIcon recording={recording} />}
              </button>
              <button onClick={() => sendMessage()} disabled={!canSend}
                style={{ width: 38, height: 38, borderRadius: 9, background: canSend ? C.red : C.lightGray, border: "none", cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: canSend ? C.white : C.midGray }}>
                <SendIcon />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 2px" }}>
              <span style={{ fontSize: 10, color: C.midGray }}>
                {activeClient ? `💡 Questions contextualisées sur ${activeClient.prenom} ${activeClient.nom}`
                : activeDoc ? "💡 Questions sur le document"
                : "Entrée pour envoyer · 📎 joindre PDF"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ APP ═══
export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [page, setPage] = useState("login");
  const [dataset, setDataset] = useState(() => localStorage.getItem("dataset"));
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [resetData, setResetData] = useState(null); // {resetToken, userId} après incident sécurité

  // Navigation interne simple sans React Router
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Intercepteur global 401 — déconnexion automatique si token expiré
  useEffect(() => {
    if (!token) return;
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await origFetch(...args);
      if (res.status === 401) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/register") ||
                            url.includes("/auth/verify-2fa") || url.includes("/auth/resend-2fa");
        if (!isAuthRoute) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("dataset");
          localStorage.removeItem("currentConvId");
          sessionStorage.removeItem("toast_shown_shared");
          window.fetch = origFetch;
          window.history.pushState({}, "", "/login");
          window.location.reload();
        }
      }
      return res;
    };
    return () => { window.fetch = origFetch; };
  }, [token]);

  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  const handleGoVerify2FA = (data) => {
    setTwoFAData(data);
    navigateTo("/verify-2fa");
  };

  const handleRequirePasswordReset = (data) => {
    setResetData(data);
    setTwoFAData(null);
    navigateTo("/reset-password-required");
  };

  const handleLogin = (userData, accessToken) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", accessToken);
    sessionStorage.removeItem("toast_shown_shared");

    setUser(userData);
    setToken(accessToken);
    setDataset(null);
    setShowAdminDashboard(false);
    setTwoFAData(null);
    setResetData(null);

    navigateTo("/chat");
  };

  const handleLogout = async () => {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("dataset");
    localStorage.removeItem("currentConvId");
    sessionStorage.removeItem("toast_shown_shared");
    sessionStorage.removeItem("twofa_session_id");

    setUser(null);
    setToken(null);
    setPage("login");
    setDataset(null);
    setShowAdminDashboard(false);
    setTwoFAData(null);
    setResetData(null);

    navigateTo("/login");
  };

  // Polling: vérifier la validité du token toutes les 15s
  // Déclenche un logout automatique si le serveur invalide la session (force_relogin, CRITICAL RBA)
  useEffect(() => {
    if (!token) return;
    const tid = setInterval(async () => {
      try {
        const r = await fetch("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.status === 401 || r.status === 403) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("dataset");
          localStorage.removeItem("currentConvId");
          sessionStorage.removeItem("toast_shown_shared");
          sessionStorage.removeItem("twofa_session_id");
          setUser(null);
          setToken(null);
          setPage("login");
          setDataset(null);
          setShowAdminDashboard(false);
          navigateTo("/login");
        }
      } catch {}
    }, 15_000);
    return () => clearInterval(tid);
  }, [token]);

  const handleGoRegister = () => {
    setPage("register");
    navigateTo("/register");
  };

  const handleGoLogin = () => {
    setPage("login");
    navigateTo("/login");
  };

  const handleGoAdmin = () => {
    setShowAdminDashboard(true);
    navigateTo("/admin");
  };

  const handleBackToChat = () => {
    setShowAdminDashboard(false);
    navigateTo("/chat");
  };

  // Page publique — accessible sans être connecté (lien email "Ce n'était pas moi")
  if (currentPath === "/report-not-me") {
    return (
      <ReportNotMe
        onGoLogin={() => {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setUser(null);
          setToken(null);
          navigateTo("/login");
        }}
      />
    );
  }

  // Si l'utilisateur n'est pas connecté
  if (!user || !token) {
    if (currentPath === "/reset-password-required" && resetData) {
      return (
        <ResetPasswordRequired
          resetToken={resetData.resetToken}
          onLogin={handleLogin}
          onBack={() => { setResetData(null); navigateTo("/login"); }}
        />
      );
    }

    if (currentPath === "/verify-2fa" && twoFAData) {
      return (
        <Verify2FA
          sessionId={twoFAData.sessionId}
          emailMasked={twoFAData.emailMasked}
          expiresIn={twoFAData.expiresIn}
          onLogin={handleLogin}
          onRequirePasswordReset={handleRequirePasswordReset}
          onBack={() => { setTwoFAData(null); navigateTo("/login"); }}
        />
      );
    }

    if (currentPath === "/register" || page === "register") {
      return (
        <RegisterPage
          onLogin={handleLogin}
          onGoLogin={handleGoLogin}
        />
      );
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onGoRegister={handleGoRegister}
        onGoVerify2FA={handleGoVerify2FA}
      />
    );
  }

  // Page prise de rendez-vous
  if (currentPath === "/prendre-rdv") {
    return <PrendreRDV />;
  }

  // Page mes rendez-vous
  if (currentPath === "/my-appointments") {
    return <MesRDV />;
  }

  // Page évaluations admin
  if (currentPath === "/admin/evaluations" && user.is_admin) {
    return (
      <AdminEvaluations
        user={user}
        token={token}
        onBack={() => { navigateTo("/admin"); setShowAdminDashboard(true); }}
        onLogout={handleLogout}
      />
    );
  }

  // Page sessions admin
  if (currentPath === "/admin/sessions" && user.is_admin) {
    return (
      <AdminSessions
        token={token}
        onBack={() => { navigateTo("/admin"); setShowAdminDashboard(true); }}
      />
    );
  }

  // Page admin
  if (currentPath === "/admin" && showAdminDashboard && user.is_admin) {
    return (
      <AdminDashboard
        user={user}
        token={token}
        onLogout={handleLogout}
        onBackToChat={handleBackToChat}
        onGoEvaluations={() => navigateTo("/admin/evaluations")}
        onGoSessions={() => navigateTo("/admin/sessions")}
      />
    );
  }

  // Page choix espace
  if (!dataset) {
    return (
      <DatasetSelector
        user={user}
        onSelect={(selectedDataset) => {
          localStorage.setItem("dataset", selectedDataset);
          setDataset(selectedDataset);
          navigateTo("/chat");
        }}
        onLogout={handleLogout}
        onGoAdmin={user.is_admin ? handleGoAdmin : null}
      />
    );
  }

  // Page chatbot principale
  return (
    <ChatBot
      user={user}
      token={token}
      onLogout={handleLogout}
      dataset={dataset}
      onChangeDataset={() => { localStorage.removeItem("dataset"); setDataset(null); }}
      onGoAdmin={user.is_admin ? handleGoAdmin : null}
      onGoPrendreRDV={() => navigateTo("/prendre-rdv")}
      onGoMesRDV={() => navigateTo("/my-appointments")}
    />
  );
}