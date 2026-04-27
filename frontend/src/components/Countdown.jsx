import { useState, useEffect } from 'react';

/**
 * Countdown timer component.
 * Shows time remaining until `targetDate`.
 * Turns urgent (red pulse) when < 5 minutes remain.
 */
export default function Countdown({ targetDate, label = 'Closes in' }) {
  const [remaining, setRemaining] = useState(calcRemaining(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(calcRemaining(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return null;

  const isExpired = remaining.total <= 0;
  const isUrgent = remaining.total > 0 && remaining.total < 5 * 60 * 1000;

  return (
    <div className={`countdown-banner ${isUrgent ? 'countdown-urgent' : ''}`}>
      <div>
        <div className="countdown-label">{label}</div>
        <div className="countdown-value">
          {isExpired
            ? 'Closed'
            : `${pad(remaining.hours)}h ${pad(remaining.minutes)}m ${pad(remaining.seconds)}s`}
        </div>
        <div className="countdown-meta">
          Until: {new Date(targetDate).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </div>
      </div>
      {isUrgent && !isExpired && (
        <div style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>
          ⚠️ Trigger window active!
        </div>
      )}
    </div>
  );
}

function calcRemaining(date) {
  const total = new Date(date) - Date.now();
  if (total <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor(total / 1000 / 60 / 60);
  return { total, hours, minutes, seconds };
}

function pad(n) { return String(n).padStart(2, '0'); }
