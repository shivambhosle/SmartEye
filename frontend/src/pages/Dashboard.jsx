import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Settings, CheckCircle2, TrendingUp, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
//import { api } from '../lib/api.js';
import { StatusBadge, PriorityBadge } from '../components/Badges.jsx';
import { citizenApi as api } from '../lib/api.js';

const STATUS_COLORS = { open: '#f0b429', 'in-progress': '#3b4252', resolved: '#22c55e' };

function computeStats(issues) {
  const open = issues.filter((i) => i.status === 'open').length;
  const inProgress = issues.filter((i) => i.status === 'in-progress').length;
  const resolved = issues.filter((i) => i.status === 'resolved').length;
  const rate = issues.length ? Math.round((resolved / issues.length) * 100) : 0;
  return { open, inProgress, resolved, rate };
}

function computeResolutionByCategory(issues) {
  const byCategory = {};
  issues.forEach((i) => {
    if (i.status !== 'resolved' || !i.resolvedAt) return;
    const days = (new Date(i.resolvedAt) - new Date(i.createdAt)) / (1000 * 60 * 60 * 24);
    if (!byCategory[i.category]) byCategory[i.category] = { total: 0, count: 0 };
    byCategory[i.category].total += days;
    byCategory[i.category].count += 1;
  });
  return Object.entries(byCategory).map(([category, { total, count }]) => ({
    category: category.replace(/_/g, ' '),
    days: Number((total / count).toFixed(1)),
  }));
}

export default function Dashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMyIssues()
      .then(setIssues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="px-4 py-24 text-center text-muted">Loading your reports...</div>;
  }
  if (error) {
    return <div className="px-4 py-24 text-center text-status-urgent">{error}</div>;
  }

  const stats = computeStats(issues);
  const statusBreakdown = [
    { name: 'Open', value: stats.open, color: STATUS_COLORS.open },
    { name: 'In Progress', value: stats.inProgress, color: STATUS_COLORS['in-progress'] },
    { name: 'Resolved', value: stats.resolved, color: STATUS_COLORS.resolved },
  ].filter((s) => s.value > 0);
  const resolutionByCategory = computeResolutionByCategory(issues);

  const statCards = [
    { icon: FolderOpen, value: stats.open, label: 'Open Issues', color: 'text-status-open bg-status-open/15' },
    { icon: Settings, value: stats.inProgress, label: 'In Progress', color: 'text-foreground bg-status-progress/40' },
    { icon: CheckCircle2, value: stats.resolved, label: 'Resolved', color: 'text-status-resolved bg-status-resolved/15' },
    { icon: TrendingUp, value: `${stats.rate}%`, label: 'Resolution Rate', color: 'text-brand-light bg-brand/15' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Citizen Dashboard</h1>
        <p className="mt-4 text-lg text-muted">Your window into the progress of our community</p>
      </div>

      <div className="mb-16 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-6 text-center">
            <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-extrabold sm:text-3xl">{s.value}</div>
            <div className="mt-1 text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {issues.length === 0 ? (
        <section className="rounded-xl bg-gradient-to-br from-surface to-brand-dark/30 p-10 text-center sm:p-16">
          <h2 className="text-2xl font-extrabold sm:text-3xl">No reports yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Once you report your first civic issue, you'll see your stats and history here.
          </p>
          <Link to="/report" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-6 py-3 font-semibold text-white">
            <Plus className="h-4 w-4" /> Report Your First Issue
          </Link>
        </section>
      ) : (
        <>
          <section className="mb-16">
            <div className="mb-6 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
              <h2 className="text-2xl font-extrabold sm:text-3xl">Community Impact Analytics</h2>
              <p className="text-muted">A visual breakdown of your reports</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-6">
                <h3 className="mb-4 font-bold">Issue Status Breakdown</h3>
                {statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                        {statusBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1e2536', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted">No data yet.</p>}
              </div>
              <div className="rounded-xl border border-border p-6">
                <h3 className="mb-4 font-bold">Average Resolution Time</h3>
                {resolutionByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={resolutionByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
                      <XAxis dataKey="category" stroke="#8b93a7" fontSize={12} />
                      <YAxis stroke="#8b93a7" fontSize={12} label={{ value: 'days', angle: -90, position: 'insideLeft', fill: '#8b93a7' }} />
                      <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #1e2536', borderRadius: 8 }} />
                      <Bar dataKey="days" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted">No resolved issues yet — this fills in once the government marks reports resolved.</p>}
              </div>
            </div>
          </section>

          <section className="mb-16">
            <div className="mb-6 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
              <h2 className="text-2xl font-extrabold sm:text-3xl">My Reported Issues</h2>
              <p className="text-muted">Track the status of your personal reports in real-time</p>
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface">
                  <tr>
                    {['Photo', 'ID', 'Category', 'Location', 'Priority', 'Status', 'Date'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue._id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <img src={issue.photoUrl} alt={issue.category} className="h-10 w-10 rounded object-cover" />
                      </td>
                      <td className="px-4 py-3">#{issue._id.slice(-4)}</td>
                      <td className="px-4 py-3">
                        <div className="capitalize">{issue.category?.replace(/_/g, ' ')}</div>
                        {issue.captureMode === 'live' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                            📷 Live Verified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="truncate font-medium text-xs" title={issue.location?.address || `${issue.location?.lat}, ${issue.location?.lng}`}>
                          {issue.location?.address || `${issue.location?.lat.toFixed(3)}, ${issue.location?.lng.toFixed(3)}`}
                        </div>
                        {issue.location?.address && (
                          <div className="text-[10px] text-muted font-mono">
                            {issue.location?.lat.toFixed(3)}, {issue.location?.lng.toFixed(3)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3">{new Date(issue.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 sm:hidden">
              {issues.map((issue) => (
                <div key={issue._id} className="flex gap-3 rounded-xl border border-border p-4">
                  <img src={issue.photoUrl} alt={issue.category} className="h-16 w-16 flex-shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">#{issue._id.slice(-4)}</span>
                      <StatusBadge status={issue.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="capitalize">{issue.category?.replace(/_/g, ' ')}</span>
                      <PriorityBadge priority={issue.priority} />
                    </div>
                    {issue.location?.address && (
                      <div className="mt-1 truncate text-[11px] text-muted">
                        📍 {issue.location.address}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-gradient-to-br from-surface to-brand-dark/30 p-10 text-center sm:p-16">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Want to make a difference?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Your reports are the foundation of a better community. Help us identify and solve problems.
            </p>
            <Link to="/report" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand-dark px-6 py-3 font-semibold text-white">
              <Plus className="h-4 w-4" /> Report a New Issue
            </Link>
          </section>
        </>
      )}
    </div>
  );
}