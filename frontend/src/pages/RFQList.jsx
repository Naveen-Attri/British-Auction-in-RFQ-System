import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/rfq.api.js';
import { StatusBadge, fmtDT, fmtCurrency } from '../components/helpers.jsx';
import { useRFQListSocket, useSocketStatus } from '../hooks/useAuctionSocket.js';

export default function RFQList() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const connected = useSocketStatus();

  async function load() {
    try {
      const data = await api.getAllRFQs();
      setRfqs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Fallback poll every 20s (in case socket misses something)
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  // Real-time updates from global socket events
  useRFQListSocket({
    onL1Update: ({ rfqId, lowestBid, lowestBidSupplier, currentCloseTime }) => {
      setRfqs((prev) =>
        prev.map((r) =>
          String(r._id) === String(rfqId)
            ? { ...r, lowestBid, lowestBidSupplier, currentCloseTime }
            : r
        )
      );
    },
    onStatusUpdate: ({ rfqId, status }) => {
      setRfqs((prev) =>
        prev.map((r) => (String(r._id) === String(rfqId) ? { ...r, status } : r))
      );
    },
  });

  if (loading) return <div className="loading-spinner">⏳ Loading auctions...</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>All Auctions</h1>
          <p>
            Live British Auction — lowest bid wins. Click any auction to view bids and participate.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={`live-indicator ${connected ? '' : 'disconnected'}`} style={{ fontSize: 12 }}>
            <span className="live-dot" />
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <Link to="/create" className="btn btn-primary">+ Create RFQ</Link>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {rfqs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📦</div>
          <p>No auctions yet</p>
          <div className="sub">Create your first RFQ to get started</div>
          <Link to="/create" className="btn btn-primary" style={{ marginTop: 20 }}>
            + Create RFQ
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            <SummaryChip label="Total" value={rfqs.length} color="var(--accent)" />
            <SummaryChip label="Active" value={rfqs.filter((r) => r.status === 'active').length} color="var(--green)" />
            <SummaryChip label="Upcoming" value={rfqs.filter((r) => r.status === 'upcoming').length} color="var(--blue)" />
            <SummaryChip label="Closed" value={rfqs.filter((r) => r.status === 'closed' || r.status === 'force_closed').length} color="var(--text-muted)" />
          </div>

          <div className="rfq-grid">
            {rfqs.map((rfq) => (
              <Link key={rfq._id} to={`/rfq/${rfq._id}`} className="rfq-card">
                <div className="rfq-card-header">
                  <div>
                    <div className="rfq-id">{rfq.rfqId}</div>
                    <div className="rfq-name">{rfq.name}</div>
                  </div>
                  <StatusBadge status={rfq.status} />
                </div>

                <div className="rfq-card-stats">
                  <div className="stat-item">
                    <div className="stat-label">Lowest Bid (L1)</div>
                    <div className={`stat-value ${rfq.lowestBid ? 'highlight' : 'text-muted'}`}>
                      {rfq.lowestBid ? fmtCurrency(rfq.lowestBid) : 'No bids yet'}
                    </div>
                    {rfq.lowestBidSupplier && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {rfq.lowestBidSupplier}
                      </div>
                    )}
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Current Close</div>
                    <div className="stat-value" style={{ fontSize: 12, fontWeight: 600 }}>
                      {fmtDT(rfq.currentCloseTime)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Hard Stop</div>
                    <div className="stat-value text-red" style={{ fontSize: 12, fontWeight: 600 }}>
                      {fmtDT(rfq.forcedCloseTime)}
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Bid Opens</div>
                    <div className="stat-value" style={{ fontSize: 12, fontWeight: 600 }}>
                      {fmtDT(rfq.bidStartTime)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryChip({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 22, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}
