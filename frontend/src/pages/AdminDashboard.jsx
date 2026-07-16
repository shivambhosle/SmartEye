import { useState, useEffect, useMemo } from 'react';
import { Search, FolderOpen, Settings, CheckCircle2, TrendingUp, Eye } from 'lucide-react';
//import { api } from '../lib/api.js';
import { StatusBadge, PriorityBadge } from '../components/Badges.jsx';
import { staffApi as api } from '../lib/api.js';

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export default function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  useEffect(() => {
    loadIssues();
  }, []);

  function loadIssues() {
    api.getAllIssues()
      .then(setIssues)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  const categoryOptions = useMemo(
    () => [...new Set(issues.map((i) => i.category))],
    [issues]
  );

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const matchesSearch = !search || (i.userNote || '').toLowerCase().includes(search.toLowerCase()) || i.category.includes(search.toLowerCase());
      const matchesCategory = !category || i.category === category;
      const matchesStatus = !status || i.status === status;
      const matchesPriority = !priority || i.priority === priority;
      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });
  }, [issues, search, category, status, priority]);

  const stats = {
    open: issues.filter((i) => i.status === 'open').length,
    inProgress: issues.filter((i) => i.status === 'in-progress').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  };
  const rate = issues.length ? Math.round((stats.resolved / issues.length) * 100) : 0;

  const statCards = [
    { icon: FolderOpen, value: stats.open, label: 'Open Issues', color: 'text-status-open bg-status-open/15' },
    { icon: Settings, value: stats.inProgress, label: 'In Progress', color: 'text-foreground bg-status-progress/40' },
    { icon: CheckCircle2, value: stats.resolved, label: 'Resolved', color: 'text-status-resolved bg-status-resolved/15' },
    { icon: TrendingUp, value: `${rate}%`, label: 'Resolution Rate', color: 'text-brand-light bg-brand/15' },
  ];

  async function updateStatus(id, newStatus) {
    // Optimistic update — reflect the change immediately, then sync with the server.
    // If the request fails, we just reload from the server to correct it.
    setIssues((prev) => prev.map((i) => (i._id === id ? { ...i, status: newStatus } : i)));
    try {
      await api.updateIssueStatus(id, newStatus);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
      loadIssues();
    }
  }

  if (loading) return <div className="px-4 py-24 text-center text-muted">Loading issues...</div>;
  if (error) return <div className="px-4 py-24 text-center text-status-urgent">{error}</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Government Admin Dashboard</h1>
        <p className="mt-4 text-lg text-muted">Monitor and manage civic issues across your jurisdiction</p>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <div className="mb-6 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-3 pl-11 pr-4 text-sm"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <option value="">All Categories</option>
          {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <option value="">All Priority</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface">
            <tr>
              {['Photo', 'ID', 'Category', 'Reporter', 'Priority', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((issue) => (
              <tr key={issue._id} className="border-t border-border">
                <td className="px-4 py-3">
                  <img src={issue.photoUrl} alt={issue.category} className="h-10 w-10 rounded object-cover" />
                </td>
                <td className="px-4 py-3">#{issue._id.slice(-4)}</td>
                <td className="px-4 py-3 capitalize">{issue.category}</td>
                <td className="px-4 py-3">{issue.reportedBy?.name || 'Unknown'}</td>
                <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                <td className="whitespace-nowrap px-4 py-3">{new Date(issue.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a href={issue.photoUrl} target="_blank" rel="noreferrer" className="rounded p-1.5 text-brand-light hover:bg-surface" title="View photo">
                      <Eye className="h-4 w-4" />
                    </a>
                    <select
                      value={issue.status}
                      onChange={(e) => updateStatus(issue._id, e.target.value)}
                      className="rounded border border-border bg-surface px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">No issues match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {filtered.map((issue) => (
          <div key={issue._id} className="flex gap-3 rounded-xl border border-border p-4">
            <img src={issue.photoUrl} alt={issue.category} className="h-16 w-16 flex-shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">#{issue._id.slice(-4)}</span>
                <StatusBadge status={issue.status} />
              </div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span className="capitalize">{issue.category} · {issue.reportedBy?.name || 'Unknown'}</span>
                <PriorityBadge priority={issue.priority} />
              </div>
              <select
                value={issue.status}
                onChange={(e) => updateStatus(issue._id, e.target.value)}
                className="w-full rounded border border-border bg-surface px-2 py-2 text-xs"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="py-10 text-center text-muted">No issues match your filters.</p>}
      </div>
    </div>
  );
}