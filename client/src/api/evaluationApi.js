// attijari_chatbot/src/api/evaluationApi.js
// API wrapper pour le module d'évaluation des réponses chatbot

const RAW_API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Si VITE_API_URL = http://127.0.0.1:8000 => ajoute /api
// Si VITE_API_URL = http://127.0.0.1:8000/api => garde tel quel
const API_BASE = RAW_API_BASE.endsWith("/api")
  ? RAW_API_BASE
  : `${RAW_API_BASE}/api`;

// ════════════════════════════════════════
// Helper: récupère le token JWT
// ════════════════════════════════════════
const getAuthHeaders = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken");

  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({
      detail: "Erreur réseau",
    }));

    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
};

// ════════════════════════════════════════
// USER endpoints
// ════════════════════════════════════════

export const fetchEvaluation = (evalId) => {
  if (!evalId) {
    throw new Error("evalId manquant");
  }

  return request(`/evaluations/${encodeURIComponent(evalId)}`);
};

export const submitFeedback = (
  evalId,
  rating,
  comment = null,
  issueType = null
) => {
  if (!evalId) {
    throw new Error("evalId manquant");
  }

  return request(`/evaluations/${encodeURIComponent(evalId)}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      rating, // "up" | "down"
      comment,
      issue_type: issueType, // "incorrect" | "incomplete" | "irrelevant" | "other"
    }),
  });
};

// ════════════════════════════════════════
// ADMIN endpoints
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

const isValidScore = (value) =>
  typeof value === "number" && Number.isFinite(value);

const clampScore = (score) => {
  if (!isValidScore(score)) return null;
  return Math.max(0, Math.min(10, score));
};

/**
 * Score affiché dans le frontend.
 *
 * Règle recommandée :
 * - Si LLM-Judge disponible et valide : afficher LLM-Judge
 * - Sinon : afficher auto_score temporairement
 * - Si parse_error : ne pas considérer le Judge comme fiable
 */
export const computeDisplayScore = (autoScore, judgeScore) => {
  const auto = clampScore(autoScore?.score_global);
  const judge = clampScore(judgeScore?.score_global);
  const judgeParseError = judgeScore?.parse_error === true;

  if (judge !== null && !judgeParseError) {
    return {
      score: Math.round(judge * 100) / 100,
      source: "JUDGE",
      hasJudge: true,
      parseError: false,
    };
  }

  if (auto !== null) {
    return {
      score: Math.round(auto * 100) / 100,
      source: judgeParseError ? "AUTO_FALLBACK" : "AUTO",
      hasJudge: false,
      parseError: judgeParseError,
    };
  }

  return {
    score: null,
    source: "NONE",
    hasJudge: false,
    parseError: judgeParseError,
  };
};

/**
 * Convertit un score /10 en nombre d'étoiles /5.
 * Exemple :
 * 10 -> 5
 * 7.5 -> 4
 * 5 -> 2.5
 * 1.95 -> 1
 */
export const scoreToStars = (score10) => {
  const safeScore = clampScore(score10);

  if (safeScore === null) {
    return 0;
  }

  const score5 = safeScore / 2;
  return Math.round(score5 * 2) / 2;
};

/**
 * Détermine le niveau de confiance et son apparence.
 */
export const getLevelDisplay = (score10) => {
  const safeScore = clampScore(score10);

  if (safeScore === null) {
    return {
      level: "NON_EVALUE",
      label: "Non évalué",
      color: "gray",
      starColor: "#9CA3AF",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-gray-600",
      badgeColor: "bg-gray-100 text-gray-700",
      icon: "⚪",
    };
  }

  if (safeScore >= 7.5) {
    return {
      level: "ELEVE",
      label: "Fiabilité élevée",
      color: "green",
      starColor: "#FBBF24",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      badgeColor: "bg-green-100 text-green-800",
      icon: "🟢",
    };
  }

  if (safeScore >= 5.0) {
    return {
      level: "MOYEN",
      label: "Fiabilité moyenne",
      color: "amber",
      starColor: "#F59E0B",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      badgeColor: "bg-amber-100 text-amber-800",
      icon: "🟠",
    };
  }

  return {
    level: "FAIBLE",
    label: "Fiabilité faible",
    color: "red",
    starColor: "#EF4444",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    badgeColor: "bg-red-100 text-red-800",
    icon: "🔴",
  };
};