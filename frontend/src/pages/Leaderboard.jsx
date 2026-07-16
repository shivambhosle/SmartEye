import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { citizenApi as api } from '../lib/api.js';

const MEDAL_COLORS = { 1: 'text-yellow-400', 2: 'text-gray-300', 3: 'text-amber-600' };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getLeaderboard()
      .then(setLeaderboard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Civic Champions Leaderboard</h1>
        <p className="mt-4 text-lg text-muted">Recognizing our top contributors making communities better</p>
      </div>

      <h2 className="mb-4 text-xl font-bold">Top Contributors</h2>

      {loading && <p className="text-center text-muted">Loading...</p>}
      {error && <p className="text-center text-status-urgent">{error}</p>}

      {!loading && !error && leaderboard.length === 0 && (
        <p className="text-center text-muted">No reports yet — be the first to show up here.</p>
      )}

      <div className="space-y-2">
        {leaderboard.map((user, index) => {
          const rank = index + 1;
          return (
            <div key={user.name + rank} className="flex items-center gap-4 rounded-xl border border-border p-4 sm:p-5">
              <div className={`w-8 text-center text-lg font-extrabold ${MEDAL_COLORS[rank] || 'text-muted'}`}>
                {rank <= 3 ? <Trophy className="mx-auto h-5 w-5" /> : rank}
              </div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 truncate font-medium">{user.name}</div>
              <div className="whitespace-nowrap text-sm font-semibold text-muted">{user.totalReports} Reports</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}