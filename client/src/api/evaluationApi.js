// client/src/api/evaluationApi.js
// API wrapper pour le module d'évaluation des réponses chatbot

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// ════════════════════════════════════════
// Helper: récupère le token JWT
// ════════════════════════════════════════
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur réseau" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
};

// ════════════════════════════════════════
// USER endpoints
// ════════════════════════════════════════

/**
 * Récupère le détail d'une évaluation (utile pour récupérer le score JUDGE
 * après que la tâche async ait fini ~3-5s plus tard).
 */
export const fetchEvaluation = (evalId) =>
  request(`/evaluations/${evalId}`);

/**
 * Soumet un feedback utilisateur 👍/👎.
 */
export const submitFeedback = (evalId, rating, comment = null, issueType = null) =>
  request(`/evaluations/${evalId}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      rating,           // "up" | "down"
      comment,
      issue_type: issueType,  // "incorrect" | "incomplete" | "irrelevant" | "other"
    }),
  });

// ════════════════════════════════════════
// ADMIN endpoints (pour dashboard - Étape 3)
// ════════════════════════════════════════

export const fetchEvalStats = (days = 30) =>
  request(`/admin/evaluations/stats?days=${days}`);

export const fetchDailyScores = (days = 7) =>
  request(`/admin/evaluations/daily?days=${days}`);

export const fetchProblematicEvals = (limit = 20) =>
  request(`/admin/evaluations/problematic?limit=${limit}`);


// ════════════════════════════════════════
// Helpers de calcul
// ════════════════════════════════════════

/**
 * Calcule le score final affiché (moyenne pondérée AUTO + JUDGE).
 * - Si JUDGE dispo: 70% JUDGE + 30% AUTO (JUDGE plus précis)
 * - Sinon: 100% AUTO
 * 
 * Returns: { score, source, hasJudge }
 *   - score: nombre 0-10
 *   - source: "AUTO" | "JUDGE" | "COMBINED"
 *   - hasJudge: boolean
 */
export const computeDisplayScore = (autoScore, judgeScore) => {
  const auto = autoScore?.score_global;
  const judge = judgeScore?.score_global;

  if (typeof judge === "number" && typeof auto === "number") {
    return {
      score: Math.round((judge * 0.7 + auto * 0.3) * 10) / 10,
      source: "COMBINED",
      hasJudge: true,
    };
  } else if (typeof judge === "number") {
    return { score: judge, source: "JUDGE", hasJudge: true };
  } else if (typeof auto === "number") {
    return { score: auto, source: "AUTO", hasJudge: false };
  }
  return { score: 5, source: "NONE", hasJudge: false };
};

/**
 * Convertit un score /10 en nombre d'étoiles /5 (avec demi-étoiles).
 * Exemples:
 *   9.5 → 4.5
 *   8.7 → 4.5
 *   7.0 → 3.5
 *   5.0 → 2.5
 *   3.0 → 1.5
 */
export const scoreToStars = (score10) => {
  const score5 = score10 / 2;
  return Math.round(score5 * 2) / 2; // arrondi au 0.5
};

/**
 * Détermine le niveau de confiance et son apparence.
 */
export const getLevelDisplay = (score10) => {
  if (score10 >= 7.5) {
    return {
      level: "ELEVE",
      label: "Fiabilité élevée",
      color: "green",
      starColor: "#FBBF24",   // jaune doré (Tailwind amber-400)
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      badgeColor: "bg-green-100 text-green-800",
      icon: "🟢",
    };
  } else if (score10 >= 5.0) {
    return {
      level: "MOYEN",
      label: "Fiabilité moyenne",
      color: "amber",
      starColor: "#F59E0B",   // orange (Tailwind amber-500)
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      badgeColor: "bg-amber-100 text-amber-800",
      icon: "🟠",
    };
  } else {
    return {
      level: "FAIBLE",
      label: "Fiabilité faible",
      color: "red",
      starColor: "#EF4444",   // rouge (Tailwind red-500)
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      badgeColor: "bg-red-100 text-red-800",
      icon: "🔴",
    };
  }
};