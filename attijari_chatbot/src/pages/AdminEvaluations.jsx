// attijari_chatbot/src/pages/AdminEvaluations.jsx
import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

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
const IcoBack = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoAlarm = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoThumb = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoChart = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;

/* ── Stat Card ── */
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden", fontFamily: "'Source Sans 3', sans-serif" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, borderRadius: "0 0 0 60px", background: `${color}12`, pointerEvents: "none" }} />
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.white, lineHeight: 1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Score Chart ── */
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontFamily: "'Source Sans 3', sans-serif", fontSize: 12 }}>
      <div style={{ color: C.textSecondary, marginBottom: 6, fontWeight: 600 }}>{fmtDate(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value?.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  );
};

function ScoreChart({ data }) {
  const rows = Array.isArray(data) ? data : [];
  const hasJudge = rows.some(d => d.avg_judge_score != null);
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px", fontFamily: "'Source Sans 3', sans-serif" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <IcoChart /> Évolution des scores quotidiens
      </div>
      {rows.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: C.textMuted, fontSize: 13 }}>
          Aucune donnée pour cette période.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} formatter={v => v === "avg_auto_score" ? "Score AUTO" : "Score JUDGE"} />
            <Line type="monotone" dataKey="avg_auto_score" name="avg_auto_score" stroke={C.orange} strokeWidth={2} dot={{ r: 3, fill: C.orange }} activeDot={{ r: 5 }} connectNulls />
            {hasJudge && <Line type="monotone" dataKey="avg_judge_score" name="avg_judge_score" stroke={C.purple} strokeWidth={2} dot={{ r: 3, fill: C.purple }} activeDot={{ r: 5 }} connectNulls strokeDasharray="4 2" />}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ── Score Badge ── */
function ScoreBadge({ score }) {
  if (score == null) return <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>;
  const color = score >= 7.5 ? C.green : score >= 5 ? C.orange : C.red;
  return (
    <span style={{ display: "inline-block", background: `${color}20`, color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {score.toFixed(1)}/10
    </span>
  );
}

/* ── Problematic Evals Table ── */
function ProblematicTable({ evals }) {
  const rows = Array.isArray(evals) ? evals : [];
  const [expanded, setExpanded] = useState(null);
  const toggle = id => setExpanded(p => p === id ? null : id);
  const fmt = iso => iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", fontFamily: "'Source Sans 3', sans-serif" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.white, display: "flex", alignItems: "center", gap: 8 }}>
          <IcoAlarm /> Réponses à réviser
        </div>
        <span style={{ fontSize: 11, color: C.textMuted }}>{rows.length} résultat(s)</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100, color: C.textMuted, fontSize: 13 }}>
          Aucune réponse problématique détectée. 🎉
        </div>
      ) : (
        <div>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 80px 130px 20px", gap: 12, padding: "10px 24px", background: "#0A0A15", fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            <span>Question</span><span style={{ textAlign: "center" }}>Score AUTO</span><span style={{ textAlign: "center" }}>Score JUDGE</span><span style={{ textAlign: "center" }}>Feedback</span><span>Date</span><span />
          </div>
          {rows.map(e => (
            <div key={e.id}>
              <div
                onClick={() => toggle(e.id)}
                style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 80px 130px 20px", gap: 12, padding: "13px 24px", borderTop: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.15s", alignItems: "center" }}
                onMouseEnter={ev => ev.currentTarget.style.background = C.bgHover}
                onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 13, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.question}</span>
                <span style={{ textAlign: "center" }}><ScoreBadge score={e.auto_score?.score_global} /></span>
                <span style={{ textAlign: "center" }}><ScoreBadge score={e.llm_judge_score?.score_global} /></span>
                <span style={{ textAlign: "center", fontSize: 16 }}>{e.user_feedback?.rating === "up" ? "👍" : e.user_feedback?.rating === "down" ? "👎" : <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{fmt(e.created_at)}</span>
                <span style={{ color: C.textMuted, fontSize: 11 }}>{expanded === e.id ? "▲" : "▼"}</span>
              </div>
              {expanded === e.id && (
                <div style={{ padding: "16px 24px", background: "#0A0A15", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Question</div>
                    <div style={{ fontSize: 13, color: C.textSecondary }}>{e.question}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Réponse</div>
                    <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 160, overflowY: "auto" }}>{e.answer}</div>
                  </div>
                  {e.user_feedback?.comment && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Commentaire</div>
                      <div style={{ fontSize: 13, color: C.textSecondary, fontStyle: "italic" }}>"{e.user_feedback.comment}"</div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.textMuted }}>
                    {e.category && <span>📂 {e.category}</span>}
                    {e.language && <span>🌐 {e.language}</span>}
                    {e.user_feedback?.issue_type && <span style={{ color: C.orange }}>⚠️ {e.user_feedback.issue_type}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══ MAIN PAGE ══ */
const PERIODS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: 365, label: "365 jours" },
];

export default function AdminEvaluations({ token, user, onBack, onLogout }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState([]);
  const [problematic, setProblematic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const h = { Authorization: `Bearer ${token}` };
      const dailyDays = Math.min(days, 90); // backend limit
      const [s, d, p] = await Promise.all([
        fetch(`${API}/api/admin/evaluations/stats?days=${days}`, { headers: h }).then(r => r.ok ? r.json() : Promise.reject(r)),
        fetch(`${API}/api/admin/evaluations/daily?days=${dailyDays}`, { headers: h }).then(r => r.ok ? r.json() : Promise.reject(r)),
        fetch(`${API}/api/admin/evaluations/problematic?limit=20`, { headers: h }).then(r => r.ok ? r.json() : Promise.reject(r)),
      ]);
      setStats(s);
      // Backend returns {"daily_scores": [...]}
      const dailyArr = Array.isArray(d?.daily_scores) ? d.daily_scores : Array.isArray(d) ? d : [];
      setDaily(dailyArr);
      // Backend returns {"items": [...], "total": N}
      const probArr = Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
      setProblematic(probArr);
    } catch {
      setError("Impossible de charger les données d'évaluation.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, token]);

  useEffect(() => { load(); }, [load]);

  const avg = v => v != null ? v.toFixed(2) : "—";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Source Sans 3', sans-serif" }}>
      <style>{`${FONT} * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }`}</style>

      {/* ── Header ── */}
      <header style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onBack}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.textSecondary, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              <IcoBack /> Retour Admin
            </button>
            <div style={{ width: 1, height: 20, background: C.border }} />
            <h1 style={{ fontSize: 15, fontWeight: 700, color: C.white }}>🛡️ Dashboard Évaluations</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              style={{ background: C.bgHover, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.textSecondary, fontSize: 12, fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>

            <button onClick={() => load(true)} disabled={refreshing}
              style={{ display: "flex", alignItems: "center", gap: 6, background: C.accent, border: "none", borderRadius: 8, padding: "7px 14px", color: C.white, cursor: refreshing ? "not-allowed" : "pointer", fontSize: 12, fontFamily: "inherit", opacity: refreshing ? 0.7 : 1 }}>
              <IcoRefresh /> {refreshing ? "..." : "Actualiser"}
            </button>

            <button onClick={onLogout}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "7px 12px", color: "#EF4444", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              ⎋ Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 14 }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: C.textMuted, fontSize: 13 }}>Chargement des données…</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "14px 20px", color: "#EF4444", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            ⚠️ {error}
            <button onClick={() => load()} style={{ background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>Réessayer</button>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <StatCard icon={<IcoChart />} label="Total évaluations" value={stats?.total_evaluations ?? 0} sub={`${days} derniers jours`} color={C.blue} />
              <StatCard icon={<IcoStar />} label="Score AUTO moyen" value={stats?.avg_auto_score != null ? `${avg(stats.avg_auto_score)}/10` : "—"} sub={stats?.avg_judge_score != null ? `Judge: ${avg(stats.avg_judge_score)}/10` : "Judge: n/a"} color={C.orange} />
              <StatCard icon={<IcoThumb />} label="Taux de feedback" value={stats?.user_feedback?.total > 0 ? `${(stats.user_feedback.satisfaction_rate || 0).toFixed(0)}%` : "—"} sub={stats?.user_feedback?.total > 0 ? `${stats.user_feedback.total} retour(s)` : "Aucun feedback reçu"} color={C.green} />
              <StatCard icon={<IcoAlarm />} label="Scores faibles (< 5)" value={stats?.needs_review ?? 0} sub="À réviser" color={C.red} />
            </div>

            {/* Chart */}
            <ScoreChart data={daily} />

            {/* Table */}
            <ProblematicTable evals={problematic} />
          </div>
        )}
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
