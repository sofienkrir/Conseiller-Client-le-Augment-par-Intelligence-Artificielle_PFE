// client/src/components/ProblematicEvalsTable.jsx
import React, { useState } from 'react';

const ScoreBadge = ({ score }) => {
  if (score == null) return <span className="text-xs text-gray-400">—</span>;
  const color = score >= 7.5 ? 'bg-green-100 text-green-700' : score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score.toFixed(1)}/10</span>;
};

const FeedbackBadge = ({ feedback }) => {
  if (!feedback) return null;
  const color = feedback === 'up' ? 'text-green-600' : 'text-red-500';
  return <span className={`text-sm font-medium ${color}`}>{feedback === 'up' ? '👍' : '👎'}</span>;
};

const ExpandedRow = ({ eval: e }) => (
  <div className="bg-gray-50 px-4 py-4 text-sm space-y-3 border-t border-gray-100">
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Question</p>
      <p className="text-gray-700">{e.question}</p>
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Réponse</p>
      <p className="text-gray-600 whitespace-pre-wrap line-clamp-6">{e.answer}</p>
    </div>
    {e.feedback_comment && (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Commentaire utilisateur</p>
        <p className="text-gray-600 italic">"{e.feedback_comment}"</p>
      </div>
    )}
    <div className="flex gap-6 flex-wrap text-xs text-gray-500">
      {e.category && <span>📂 {e.category}</span>}
      {e.language && <span>🌐 {e.language}</span>}
      {e.feedback_issue_type && <span>⚠️ {e.feedback_issue_type}</span>}
    </div>
  </div>
);

const ProblematicEvalsTable = ({ evaluations }) => {
  const [expanded, setExpanded] = useState(null);

  const toggle = (id) => setExpanded(prev => (prev === id ? null : id));

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">🔍 Réponses à réviser</h2>
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
          Aucune réponse problématique détectée. 🎉
        </div>
      </div>
    );
  }

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">🔍 Réponses à réviser</h2>
        <span className="text-sm text-gray-400">{evaluations.length} résultat(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold">Question</th>
              <th className="text-center px-4 py-3 font-semibold">Score AUTO</th>
              <th className="text-center px-4 py-3 font-semibold">Score JUDGE</th>
              <th className="text-center px-4 py-3 font-semibold">Feedback</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {evaluations.map((e) => {
              const isOpen = expanded === e.eval_id;
              return (
                <React.Fragment key={e.eval_id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggle(e.eval_id)}
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-gray-700">{e.question}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={e.auto_score} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge score={e.judge_score} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <FeedbackBadge feedback={e.user_feedback} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(e.created_at)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {isOpen ? '▲' : '▼'}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <ExpandedRow eval={e} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProblematicEvalsTable;
