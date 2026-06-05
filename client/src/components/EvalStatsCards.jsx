// client/src/components/EvalStatsCards.jsx
import React from 'react';

const Card = ({ icon, label, value, sub, color }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-5 flex items-center gap-4`}>
    <div className="text-3xl">{icon}</div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const EvalStatsCards = ({ stats }) => {
  if (!stats) return null;

  const avg = stats.avg_auto_score != null ? stats.avg_auto_score.toFixed(2) : '—';
  const judgeAvg = stats.avg_judge_score != null ? stats.avg_judge_score.toFixed(2) : '—';
  const feedbackRate = stats.total_evaluations > 0
    ? ((stats.total_with_feedback / stats.total_evaluations) * 100).toFixed(1) + '%'
    : '0%';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card
        icon="📊"
        label="Total évaluations"
        value={stats.total_evaluations ?? 0}
        sub={`${stats.days} derniers jours`}
        color="border-blue-500"
      />
      <Card
        icon="⭐"
        label="Score AUTO moyen"
        value={avg !== '—' ? `${avg} / 10` : '—'}
        sub={judgeAvg !== '—' ? `Judge: ${judgeAvg}/10` : 'Judge: non disponible'}
        color="border-amber-400"
      />
      <Card
        icon="💬"
        label="Taux de feedback"
        value={feedbackRate}
        sub={`${stats.total_with_feedback ?? 0} feedbacks reçus`}
        color="border-green-500"
      />
      <Card
        icon="⚠️"
        label="Scores faibles (< 5)"
        value={stats.low_score_count ?? 0}
        sub="Nécessitent une révision"
        color="border-red-500"
      />
    </div>
  );
};

export default EvalStatsCards;
