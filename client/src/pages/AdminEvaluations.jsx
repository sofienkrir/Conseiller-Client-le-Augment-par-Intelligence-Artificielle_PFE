// client/src/pages/AdminEvaluations.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import { fetchEvalStats, fetchDailyScores, fetchProblematicEvals } from '../api/evaluationApi';
import EvalStatsCards from '../components/EvalStatsCards';
import ScoreChart from '../components/ScoreChart';
import ProblematicEvalsTable from '../components/ProblematicEvalsTable';

const PERIODS = [
  { value: 7,   label: '7 jours' },
  { value: 30,  label: '30 jours' },
  { value: 90,  label: '90 jours' },
  { value: 365, label: '365 jours' },
];

const AdminEvaluations = () => {
  const navigate  = useNavigate();
  const user      = getCurrentUser();

  const [days,         setDays]         = useState(30);
  const [stats,        setStats]        = useState(null);
  const [dailyData,    setDailyData]    = useState([]);
  const [problematic,  setProblematic]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);

  // Guard: redirect non-admins
  useEffect(() => {
    if (!user || !user.is_admin) navigate('/chat', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [s, d, p] = await Promise.all([
        fetchEvalStats(days),
        fetchDailyScores(days),
        fetchProblematicEvals(20),
      ]);
      setStats(s);
      setDailyData(d.daily || d || []);
      setProblematic(p.evaluations || p || []);
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!user?.is_admin) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded hover:bg-gray-100"
            >
              ← Retour
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-lg font-bold text-gray-800">🛡️ Dashboard Évaluations</h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {refreshing ? '⏳' : '🔄'} Actualiser
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-gray-500 text-sm">Chargement des données…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm flex items-center gap-2">
            ⚠️ {error}
            <button
              onClick={() => loadData()}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            <EvalStatsCards stats={stats} />
            <ScoreChart data={dailyData} />
            <ProblematicEvalsTable evaluations={problematic} />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminEvaluations;
