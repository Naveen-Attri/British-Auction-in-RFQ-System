// Shared helper components

// Status badge
export function StatusBadge({ status }) {
  const labels = {
    active: 'Active',
    upcoming: 'Upcoming',
    closed: 'Closed',
    force_closed: 'Force Closed',
  };
  return (
    <span className={`badge badge-${status}`}>
      {labels[status] || status}
    </span>
  );
}

// Rank badge (L1, L2, ...)
export function RankBadge({ rank }) {
  const cls = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n';
  return <span className={`rank-badge ${cls}`}>L{rank}</span>;
}

// Format date/time
export function fmtDT(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function fmtCurrency(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Event type icons for activity log
export function eventIcon(type) {
  const map = {
    BID_PLACED: '💰',
    EXTENSION_TRIGGERED: '⏰',
    AUCTION_CLOSED: '🔒',
    AUCTION_FORCE_CLOSED: '🛑',
    AUCTION_STARTED: '🚀',
  };
  return map[type] || '📋';
}
