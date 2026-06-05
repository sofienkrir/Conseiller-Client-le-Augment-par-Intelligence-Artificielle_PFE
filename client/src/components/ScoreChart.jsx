// client/src/components/ScoreChart.jsx
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{fmt(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value?.toFixed(2)}</strong>
        </p>
      ))}
    </div>
  );
};

const ScoreChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">📈 Évolution des scores</h2>
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Aucune donnée pour la période sélectionnée.
        </div>
      </div>
    );
  }

  const hasJudge = data.some((d) => d.avg_judge_score != null);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">📈 Évolution des scores quotidiens</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="date"
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(v) => (v === 'avg_auto_score' ? 'Score AUTO' : 'Score JUDGE')}
          />
          <Line
            type="monotone"
            dataKey="avg_auto_score"
            name="avg_auto_score"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ r: 3, fill: '#F59E0B' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
          {hasJudge && (
            <Line
              type="monotone"
              dataKey="avg_judge_score"
              name="avg_judge_score"
              stroke="#6366F1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366F1' }}
              activeDot={{ r: 5 }}
              connectNulls
              strokeDasharray="4 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreChart;
