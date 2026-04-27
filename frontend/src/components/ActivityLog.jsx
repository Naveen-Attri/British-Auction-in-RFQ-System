import { eventIcon, fmtDT } from './helpers.jsx';

export default function ActivityLog({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-muted" style={{ padding: '20px 0', fontSize: 13 }}>
        No activity yet.
      </div>
    );
  }

  // Show newest first
  const sorted = [...logs].reverse();

  return (
    <div className="activity-log">
      {sorted.map((log) => (
        <div key={log._id} className={`log-item log-${log.eventType}`}>
          <div className="log-icon">{eventIcon(log.eventType)}</div>
          <div className="log-body">
            <div className="log-msg">{log.message}</div>
            <div className="log-time">{fmtDT(log.timestamp)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
