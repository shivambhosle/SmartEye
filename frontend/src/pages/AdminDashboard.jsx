import { useState, useEffect, useMemo } from 'react';
import { Search, FolderOpen, Settings, CheckCircle2, TrendingUp, Eye, Sparkles, ShieldCheck, ShieldAlert, X } from 'lucide-react';
//import { api } from '../lib/api.js';
import { StatusBadge, PriorityBadge } from '../components/Badges.jsx';
import { staffApi as api, getPhotoUrl } from '../lib/api.js';

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved', 'rejected'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export default function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [triageIssue, setTriageIssue] = useState(null);

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

  async function updateStatus(id, newStatus, resolutionPhotoUrl, resolutionNote, rejectionReason) {
    // Optimistic update — reflect the change immediately, then sync with the server.
    // If the request fails, we just reload from the server to correct it.
    setIssues((prev) => prev.map((i) => (i._id === id ? { ...i, status: newStatus, rejectionReason } : i)));
    try {
      await api.updateIssueStatus(id, newStatus, resolutionPhotoUrl, resolutionNote, rejectionReason);
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
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm capitalize">
          <option value="">All Categories</option>
          {categoryOptions.map((c) => <option key={c} value={c}>{c?.replace(/_/g, ' ')}</option>)}
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
              {['Photo', 'ID', 'Category', 'Reporter', 'Priority', 'AI Triage', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((issue) => (
              <tr key={issue._id} className="border-t border-border">
                <td className="px-4 py-3">
                  <img src={getPhotoUrl(issue.photoUrl)} alt={issue.category} className="h-10 w-10 rounded object-cover" />
                </td>
                <td className="px-4 py-3">#{issue._id.slice(-4)}</td>
                <td className="px-4 py-3">
                  <div className="capitalize font-medium">{issue.category?.replace(/_/g, ' ')}</div>
                  {issue.captureMode === 'live' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      📷 Live Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                      📁 Gallery
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{issue.reportedBy?.name || 'Unknown'}</div>
                  {issue.location?.address ? (
                    <div className="text-[11px] text-muted max-w-[160px] truncate" title={issue.location.address}>
                      📍 {issue.location.address}
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted font-mono">
                      {issue.location?.lat?.toFixed(3)}, {issue.location?.lng?.toFixed(3)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                <td className="px-4 py-3">
                  {issue.aiAnalysis ? (
                    <button
                      type="button"
                      onClick={() => setTriageIssue(issue)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all hover:scale-105 ${
                        issue.aiAnalysis.isAuthentic === false
                          ? 'border-red-500/50 bg-red-500/15 text-red-300'
                          : issue.aiAnalysis.severity === 'critical'
                          ? 'border-status-urgent/50 bg-status-urgent/15 text-status-urgent'
                          : 'border-brand/40 bg-brand/10 text-brand-light'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{issue.aiAnalysis.severity?.toUpperCase() || 'TRIAGE'}</span>
                      {issue.aiAnalysis.isAuthentic === false && (
                        <span className="rounded bg-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-200">
                          REVIEW NEEDED
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-muted">Standard</span>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                <td className="whitespace-nowrap px-4 py-3">{new Date(issue.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a href={getPhotoUrl(issue.photoUrl)} target="_blank" rel="noreferrer" className="rounded p-1.5 text-brand-light hover:bg-surface" title="View photo">
                      <Eye className="h-4 w-4" />
                    </a>
                    <select
                      value={issue.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus === 'rejected') {
                          const reason = window.prompt(
                            'Enter rejection reason (citizen will be notified of municipal guidelines):',
                            'Prohibited Activity: Screen/Re-photo spoof detected. Live on-site physical evidence is required.'
                          );
                          if (!reason) return;
                          updateStatus(issue._id, newStatus, null, null, reason);
                        } else {
                          updateStatus(issue._id, newStatus);
                        }
                      }}
                      className="rounded border border-border bg-surface px-2 py-1 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-muted">No issues match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {filtered.map((issue) => (
          <div key={issue._id} className="flex gap-3 rounded-xl border border-border p-4">
            <img src={getPhotoUrl(issue.photoUrl)} alt={issue.category} className="h-16 w-16 flex-shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">#{issue._id.slice(-4)}</span>
                <StatusBadge status={issue.status} />
              </div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span className="capitalize">{issue.category?.replace(/_/g, ' ')} · {issue.reportedBy?.name || 'Unknown'}</span>
                <PriorityBadge priority={issue.priority} />
              </div>

              {issue.aiAnalysis && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setTriageIssue(issue)}
                    className="inline-flex items-center gap-1 text-xs text-brand-light font-semibold hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> View AI Diagnosis ({issue.aiAnalysis.severity})
                  </button>
                </div>
              )}

              <select
                value={issue.status}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  if (newStatus === 'rejected') {
                    const reason = window.prompt(
                      'Enter rejection reason (citizen will be notified of municipal guidelines):',
                      'Prohibited Activity: Screen/Re-photo spoof detected. Live on-site physical evidence is required.'
                    );
                    if (!reason) return;
                    updateStatus(issue._id, newStatus, null, null, reason);
                  } else {
                    updateStatus(issue._id, newStatus);
                  }
                }}
                className="w-full rounded border border-border bg-surface px-2 py-2 text-xs"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="py-10 text-center text-muted">No issues match your filters.</p>}
      </div>

      {/* AI Triage & Authenticity Inspection Modal */}
      {triageIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-brand/20 flex items-center justify-center text-brand-light">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI Vision Triage & Authenticity Report</h3>
                  <p className="text-xs text-muted">Issue #{triageIssue._id.slice(-6)} • Analyzed by Google Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setTriageIssue(null)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <img
                  src={getPhotoUrl(triageIssue.photoUrl)}
                  alt={triageIssue.category}
                  className="w-full h-48 sm:h-56 rounded-xl object-cover border border-border shadow-inner"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <span>Source: <strong className="capitalize text-foreground">{triageIssue.captureMode || 'gallery'}</strong></span>
                  <a href={getPhotoUrl(triageIssue.photoUrl)} target="_blank" rel="noreferrer" className="text-brand-light hover:underline font-medium">
                    Open Full Image ↗
                  </a>
                </div>
              </div>

              <div className="space-y-3.5 text-sm">
                {/* Authenticity Box */}
                <div className={`p-3.5 rounded-xl border ${
                  triageIssue.aiAnalysis?.isAuthentic === false 
                    ? 'border-red-500/50 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                    {triageIssue.aiAnalysis?.isAuthentic === false ? (
                      <>
                        <ShieldAlert className="h-4 w-4 text-red-400" />
                        <span>Verification Required (Screen / Re-photo suspected)</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span>Verified Real-World Photo</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed opacity-95">
                    {triageIssue.aiAnalysis?.authenticityNote || 'Authentic on-site outdoor photo.'}
                  </p>
                </div>

                {/* AI Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-surface-alt">
                    <span className="text-muted block text-[11px]">AI Severity</span>
                    <span className="font-bold text-sm uppercase text-brand-light">
                      {triageIssue.aiAnalysis?.severity || 'Standard'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-alt">
                    <span className="text-muted block text-[11px]">Assessment Certainty</span>
                    <span className="font-bold text-sm text-foreground">
                      High ({Math.round((triageIssue.aiAnalysis?.confidence || 0.95) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Department & Location */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-surface-alt">
                    <span className="text-muted block text-[11px]">Auto-Routed Department</span>
                    <span className="font-semibold text-foreground">
                      {triageIssue.aiAnalysis?.recommendedDepartment || triageIssue.department || 'Roads / Public Works'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface-alt">
                    <span className="text-muted block text-[11px]">Verified Location</span>
                    <span className="font-semibold text-foreground truncate block" title={triageIssue.location?.address}>
                      {triageIssue.location?.address ? `📍 ${triageIssue.location.address}` : `${triageIssue.location?.lat?.toFixed(4)}, ${triageIssue.location?.lng?.toFixed(4)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Description */}
            <div className="rounded-xl border border-border bg-surface-alt/70 p-4">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Automated Municipal Work-Order Summary
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                {triageIssue.aiAnalysis?.description || 'No detailed analysis generated.'}
              </p>
            </div>

            {triageIssue.userNote && (
              <div className="text-xs text-muted bg-surface-alt/40 p-3 rounded-lg border border-border">
                <strong className="text-foreground">Citizen Comment:</strong> "{triageIssue.userNote}"
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
              {triageIssue.status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => {
                    const defaultReason = triageIssue.aiAnalysis?.isAuthentic === false
                      ? `Prohibited Activity: Screen/Re-photo spoof detected (${triageIssue.aiAnalysis?.authenticityNote || 'invalid media'}). Live on-site physical evidence is required.`
                      : 'Prohibited Activity: Screen/Re-photo spoof detected. Live on-site physical evidence is required.';
                    const reason = window.prompt(
                      'Confirm rejection reason (this will be sent to the citizen with official municipal guidelines):',
                      defaultReason
                    );
                    if (reason) {
                      updateStatus(triageIssue._id, 'rejected', null, null, reason);
                      setTriageIssue(null);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600/20 border border-red-500/50 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-600/30 transition-colors"
                >
                  <ShieldAlert className="h-4 w-4 text-red-400" />
                  Reject Report as Prohibited Spoof
                </button>
              )}
              <button
                onClick={() => setTriageIssue(null)}
                className="rounded-lg bg-surface-alt px-5 py-2 text-sm font-semibold hover:bg-border transition-colors ml-auto"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}