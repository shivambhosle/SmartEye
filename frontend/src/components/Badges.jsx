const STATUS_STYLES = {
  open: 'bg-status-open/15 text-status-open',
  'in-progress': 'bg-status-progress/40 text-foreground',
  resolved: 'bg-status-resolved/15 text-status-resolved',
};

const PRIORITY_STYLES = {
  low: 'bg-status-low/15 text-status-low',
  medium: 'bg-status-medium/15 text-status-medium',
  high: 'bg-status-high/15 text-status-high',
  urgent: 'bg-status-urgent/15 text-status-urgent',
};

export function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-surface'}`}>
      {status.replace('-', ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${PRIORITY_STYLES[priority] || 'bg-surface'}`}>
      {priority}
    </span>
  );
}