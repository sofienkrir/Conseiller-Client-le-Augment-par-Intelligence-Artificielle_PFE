// client/src/components/ConfidenceScore.jsx
// Composant: Badge de fiabilité avec étoiles + tooltip détaillé

import { useState, useEffect, useRef } from "react";
import { Star, StarHalf, Info, Loader2, AlertTriangle, Shield } from "lucide-react";
import {
  fetchEvaluation,
  computeDisplayScore,
  scoreToStars,
  getLevelDisplay,
} from "../api/evaluationApi";


// ════════════════════════════════════════
// Composant Étoile (vide / pleine / demi)
// ════════════════════════════════════════
function StarIcon({ filled, half, color }) {
  if (half) {
    return (
      <div className="relative inline-flex w-4 h-4">
        <Star className="absolute w-4 h-4 text-gray-200" fill="currentColor" />
        <StarHalf className="absolute w-4 h-4" fill={color} color={color} />
      </div>
    );
  }
  return (
    <Star
      className="w-4 h-4"
      fill={filled ? color : "transparent"}
      color={filled ? color : "#D1D5DB"}
      strokeWidth={1.5}
    />
  );
}


// ════════════════════════════════════════
// Composant principal: ConfidenceScore
// ════════════════════════════════════════

export default function ConfidenceScore({ evalId, initialAutoScore = null }) {
  const [autoScore, setAutoScore] = useState(initialAutoScore);
  const [judgeScore, setJudgeScore] = useState(null);
  const [judgeStatus, setJudgeStatus] = useState("pending");
  const [showTooltip, setShowTooltip] = useState(false);
  const [pollingActive, setPollingActive] = useState(true);
  const pollingRef = useRef(null);

  // ════════════════════════════════════════
  // Polling pour récupérer le score JUDGE
  // (async, arrive ~3-5s après la réponse)
  // ════════════════════════════════════════
  useEffect(() => {
    if (!evalId || !pollingActive) return;

    let attempts = 0;
    const maxAttempts = 6; // 6 × 2s = 12s max

    const checkJudge = async () => {
      try {
        const data = await fetchEvaluation(evalId);
        attempts++;

        // Si le score AUTO n'était pas dispo en props, on le récupère ici
        if (!autoScore && data.auto_score) {
          setAutoScore(data.auto_score);
        }

        if (data.llm_judge_status === "completed" && data.llm_judge_score) {
          setJudgeScore(data.llm_judge_score);
          setJudgeStatus("completed");
          setPollingActive(false);  // stop polling
          return;
        }

        if (data.llm_judge_status === "failed") {
          setJudgeStatus("failed");
          setPollingActive(false);
          return;
        }

        // Arrêter après maxAttempts
        if (attempts >= maxAttempts) {
          setPollingActive(false);
        }
      } catch (err) {
        console.warn("[ConfidenceScore] Polling error:", err.message);
        attempts++;
        if (attempts >= maxAttempts) {
          setPollingActive(false);
        }
      }
    };

    // Premier appel immédiat
    checkJudge();
    // Puis toutes les 2 secondes
    pollingRef.current = setInterval(checkJudge, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [evalId, pollingActive]);

  // ════════════════════════════════════════
  // Calcul du score d'affichage
  // ════════════════════════════════════════
  const { score, source, hasJudge } = computeDisplayScore(autoScore, judgeScore);
  const stars = scoreToStars(score);
  const display = getLevelDisplay(score);

  // Détection d'hallucination (du LLM-Judge)
  const hasHallucination = judgeScore?.flags?.hallucination === true;
  const hasInventedData = judgeScore?.flags?.donnees_inventees === true;
  const hasRiskyReco = judgeScore?.flags?.recommandation_risquee === true;
  const anyFlag = hasHallucination || hasInventedData || hasRiskyReco;

  // ════════════════════════════════════════
  // Render
  // ════════════════════════════════════════
  if (!evalId || !autoScore) return null;

  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          ${display.bgColor} ${display.borderColor} border
          text-sm transition-all
        `}
      >
        {/* Icône bouclier */}
        <Shield className={`w-3.5 h-3.5 ${display.textColor}`} />

        {/* Étoiles */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => {
            const filled = stars >= i;
            const half = !filled && stars >= i - 0.5;
            return (
              <StarIcon
                key={i}
                filled={filled}
                half={half}
                color={display.starColor}
              />
            );
          })}
        </div>

        {/* Score numérique */}
        <span className={`font-bold ${display.textColor} text-xs`}>
          {stars.toFixed(1)}/5
        </span>

        {/* Séparateur */}
        <span className="text-gray-300">•</span>

        {/* Label de fiabilité */}
        <span className={`text-xs font-medium ${display.textColor}`}>
          {display.label}
        </span>

        {/* Indicateur JUDGE en cours */}
        {pollingActive && !hasJudge && (
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
          </span>
        )}

        {/* Flag alerte si hallucination */}
        {anyFlag && (
          <span title="Anomalie détectée">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 ml-1" />
          </span>
        )}

        {/* Icône info pour tooltip */}
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          className="ml-0.5 text-gray-400 hover:text-gray-600 transition"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TOOLTIP */}
      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-w-[calc(100vw-2rem)]"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 text-sm">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
              <Shield className={`w-4 h-4 ${display.textColor}`} />
              <h4 className="font-bold text-gray-800">Évaluation de la réponse</h4>
            </div>

            {/* Score AUTO */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">📊 Score automatique</span>
                <span className="text-xs font-bold text-gray-800">
                  {autoScore.score_global.toFixed(2)}/10
                </span>
              </div>
              {autoScore.sub_scores && (
                <div className="space-y-1 ml-2 text-xs text-gray-500">
                  <SubScoreRow
                    label="Ancrage aux sources"
                    score={autoScore.sub_scores.groundedness}
                  />
                  <SubScoreRow
                    label="Sources citées"
                    score={autoScore.sub_scores.citation}
                  />
                  <SubScoreRow
                    label="Couverture"
                    score={autoScore.sub_scores.coverage}
                  />
                  <SubScoreRow
                    label="Cohérence longueur"
                    score={autoScore.sub_scores.length_consistency}
                  />
                </div>
              )}
            </div>

            {/* Score LLM-Judge */}
            {judgeStatus === "completed" && judgeScore && (
              <div className="mb-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    🤖 Évaluation IA (Gemini)
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    {judgeScore.score_global.toFixed(2)}/10
                  </span>
                </div>
                {judgeScore.scores && (
                  <div className="space-y-1 ml-2 text-xs text-gray-500">
                    <SubScoreRow label="Véracité" score={judgeScore.scores.veracite} />
                    <SubScoreRow label="Pertinence" score={judgeScore.scores.pertinence} />
                    <SubScoreRow label="Clarté" score={judgeScore.scores.clarte} />
                    <SubScoreRow
                      label="Conformité linguistique"
                      score={judgeScore.scores.conformite_linguistique}
                    />
                  </div>
                )}

                {judgeScore.justification && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 italic">
                    💬 « {judgeScore.justification} »
                  </div>
                )}
              </div>
            )}

            {/* JUDGE pending */}
            {pollingActive && judgeStatus === "pending" && (
              <div className="mb-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Évaluation IA en cours...</span>
              </div>
            )}

            {/* JUDGE failed */}
            {judgeStatus === "failed" && (
              <div className="mb-3 pt-3 border-t border-gray-100 text-xs text-gray-400 italic">
                Évaluation IA indisponible
              </div>
            )}

            {/* Flags d'alerte */}
            {anyFlag && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Alertes détectées
                </div>
                <ul className="text-xs text-red-700 space-y-0.5 ml-2">
                  {hasHallucination && <li>• Possible hallucination</li>}
                  {hasInventedData && <li>• Données potentiellement inventées</li>}
                  {hasRiskyReco && <li>• Recommandation à vérifier</li>}
                </ul>
              </div>
            )}

            {/* Footer info */}
            <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
              {hasJudge
                ? "Score final = 70% IA + 30% automatique"
                : "Score basé sur l'analyse automatique"}
            </div>
          </div>

          {/* Petit triangle pointant vers le badge */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
          </div>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════
// Composant: ligne de sous-score
// ════════════════════════════════════════
function SubScoreRow({ label, score }) {
  if (typeof score !== "number") return null;
  
  let color = "text-gray-400";
  if (score >= 8) color = "text-green-600";
  else if (score >= 5) color = "text-amber-600";
  else color = "text-red-600";

  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <span className={`font-mono font-semibold ${color}`}>
        {score.toFixed(1)}/10
      </span>
    </div>
  );
}