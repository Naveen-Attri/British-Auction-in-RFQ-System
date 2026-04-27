import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/rfq.api.js';
import {
  StatusBadge, RankBadge, fmtDT, fmtDate, fmtCurrency,
} from '../components/helpers.jsx';
import Countdown from '../components/Countdown.jsx';
import ActivityLog from '../components/ActivityLog.jsx';
import BidForm from '../components/BidForm.jsx';
import {
  useAuctionSocket,
  useSocketStatus,
} from '../hooks/useAuctionSocket.js';

export default function RFQDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [viewers, setViewers] = useState(1);
  const [newBidIds, setNewBidIds] = useState(new Set()); // for flash animation
  const [simulating, setSimulating] = useState(false);
  const [warring, setWarring] = useState(false);
  const logRef = useRef(null);
  const connected = useSocketStatus();

  const load = useCallback(async () => {
    try {
      const res = await api.getRFQ(id);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Auto-scroll activity log when new entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [data?.logs]);

  // ── Socket.IO real-time handlers ──────────────────────────────
  useAuctionSocket(id, {
    onBidNew: ({ bid, rankedBids, currentCloseTime, logEntry }) => {
      setData((prev) => {
        if (!prev) return prev;
        // Flash this bid
        setNewBidIds((s) => {
          const n = new Set(s);
          n.add(bid._id);
          setTimeout(() => setNewBidIds((s2) => { const n2 = new Set(s2); n2.delete(bid._id); return n2; }), 1800);
          return n;
        });

        return {
          ...prev,
          rfq: { ...prev.rfq, currentCloseTime },
          bids: rankedBids,
          allBids: [bid, ...prev.allBids.filter((b) => b._id !== bid._id)],
          logs: [...prev.logs, logEntry],
        };
      });
    },

    onExtended: (ext) => {
      setToast(ext);
      setTimeout(() => setToast(null), 7000);
      setData((prev) =>
        prev ? { ...prev, rfq: { ...prev.rfq, currentCloseTime: ext.newCloseTime } } : prev
      );
    },

    onStatusChange: ({ status }) => {
      setData((prev) =>
        prev ? { ...prev, rfq: { ...prev.rfq, status } } : prev
      );
    },

    onViewers: (count) => setViewers(count),
  });
  // ─────────────────────────────────────────────────────────────

  function handleBidPlaced(result) {
    // The socket event will update data; just show extension toast if fired
    if (result.extension?.extended) {
      setToast(result.extension);
      setTimeout(() => setToast(null), 7000);
    }
  }

  async function handleSimulate() {
    setSimulating(true);
    try {
      await api.simulateBid(id);
    } catch (err) {
      alert('Simulate error: ' + err.message);
    } finally {
      setSimulating(false);
    }
  }

  async function handleSimulateWar() {
    setWarring(true);
    try {
      await api.simulateWar(id);
      setTimeout(() => setWarring(false), 7000);
    } catch (err) {
      alert('Simulate war error: ' + err.message);
      setWarring(false);
    }
  }

  if (loading) return <div className="loading-spinner">⏳ Loading...</div>;
  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return null;

  const { rfq, bids, allBids, logs } = data;
  const isOpen = rfq.status === 'active';
  const isClosed = rfq.status === 'closed' || rfq.status === 'force_closed';

  return (
    <div>
      <Link to="/" className="back-btn">← Back to All Auctions</Link>

      {/* ── Header ── */}
      <div className="detail-header">
        <div className="detail-title-group">
          <div className="detail-rfq-id">{rfq.rfqId}</div>
          <div className="detail-rfq-name">{rfq.name}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StatusBadge status={rfq.status} />
            <LiveIndicator connected={connected} />
            <ViewersChip count={viewers} />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Service Date
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtDate(rfq.serviceDate)}</div>

          {/* Simulate buttons — only when active */}
          {isOpen && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                id="btn-simulate"
                className="btn btn-secondary btn-sm"
                onClick={handleSimulate}
                disabled={simulating}
                title="Place one random supplier bid"
              >
                {simulating ? '⏳' : '🤖'} Simulate Bid
              </button>
              <button
                id="btn-simulate-war"
                className={`btn btn-sm ${warring ? 'btn-danger' : 'btn-war'}`}
                onClick={handleSimulateWar}
                disabled={warring}
                title="Trigger 5 rapid bids to create a live bidding war"
              >
                {warring ? '🔥 War in progress...' : '⚔️ Bidding War'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Countdown ── */}
      {!isClosed && (
        <Countdown targetDate={rfq.currentCloseTime} label="Current Close In" />
      )}

      {/* Forced close warning */}
      {!isClosed && (
        <div className="forced-close-bar">
          🛑 <strong>Hard Stop:</strong>&nbsp;{fmtDT(rfq.forcedCloseTime)}
          &nbsp;— auction will never extend beyond this.
        </div>
      )}

      <div className="detail-grid">
        {/* ── LEFT COLUMN ── */}
        <div>
          {/* Live Bid Rankings */}
          <div className="card section-gap">
            <div className="card-title flex-between">
              <span>📊 Live Bid Rankings</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {bids.length} supplier{bids.length !== 1 ? 's' : ''}
              </span>
            </div>

            {bids.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 13 }}>No bids placed yet. Be the first!</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Supplier</th>
                      <th>Freight</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>Total</th>
                      <th>Transit</th>
                      <th>Validity</th>
                      <th>Placed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((bid) => (
                      <tr
                        key={bid._id}
                        className={[
                          bid.rank === 1 ? 'row-l1' : '',
                          newBidIds.has(bid._id) ? 'bid-flash' : '',
                        ].join(' ')}
                      >
                        <td><RankBadge rank={bid.rank} /></td>
                        <td style={{ fontWeight: bid.rank === 1 ? 700 : 400, color: 'var(--text-primary)' }}>
                          {bid.supplierName}
                          {bid.rank === 1 && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>
                              ★ L1
                            </span>
                          )}
                        </td>
                        <td>{fmtCurrency(bid.freightCharges)}</td>
                        <td>{fmtCurrency(bid.originCharges)}</td>
                        <td>{fmtCurrency(bid.destinationCharges)}</td>
                        <td style={{ fontWeight: 700, color: bid.rank === 1 ? 'var(--green)' : 'var(--text-primary)' }}>
                          {fmtCurrency(bid.totalBid)}
                        </td>
                        <td>{bid.transitTime} days</td>
                        <td>{fmtDate(bid.quoteValidity)}</td>
                        <td style={{ fontSize: 12 }}>{fmtDT(bid.placedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bid Form */}
          {isOpen && (
            <div className="section-gap">
              <BidForm rfqId={id} onBidPlaced={handleBidPlaced} />
            </div>
          )}

          {/* Closed state */}
          {isClosed && (
            <div className="card section-gap" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                {rfq.status === 'force_closed' ? '🛑' : '🔒'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>
                {rfq.status === 'force_closed' ? 'Force Closed' : 'Auction Closed'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                {rfq.status === 'force_closed'
                  ? 'Hard stop time reached — no more extensions possible.'
                  : 'Bidding period ended. L1 supplier wins.'}
              </div>
              {bids.length > 0 && (
                <div className="winner-card">
                  <div className="winner-label">🏆 Winner (L1)</div>
                  <div className="winner-name">{bids[0].supplierName}</div>
                  <div className="winner-amount">{fmtCurrency(bids[0].totalBid)}</div>
                </div>
              )}
            </div>
          )}

          {/* Full bid history */}
          {allBids.length > bids.length && (
            <div className="card section-gap">
              <div className="card-title">🕒 Full Bid History (All Revisions)</div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Supplier</th><th>Total</th><th>Status</th><th>Placed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBids.map((bid) => (
                      <tr key={bid._id} style={{ opacity: bid.isLatest ? 1 : 0.5 }}>
                        <td style={{ color: 'var(--text-primary)' }}>{bid.supplierName}</td>
                        <td style={{ fontWeight: 600 }}>{fmtCurrency(bid.totalBid)}</td>
                        <td>
                          {bid.isLatest
                            ? <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ Active</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Superseded</span>
                          }
                        </td>
                        <td style={{ fontSize: 12 }}>{fmtDT(bid.placedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* Config */}
          <div className="card section-gap">
            <div className="card-title">⚙️ Auction Configuration</div>
            <div className="config-grid">
              <div className="config-item">
                <div className="config-item-label">Trigger Window</div>
                <div className="config-item-value">{rfq.triggerWindowMinutes} min</div>
              </div>
              <div className="config-item">
                <div className="config-item-label">Extension</div>
                <div className="config-item-value">{rfq.extensionDurationMinutes} min</div>
              </div>
              <div className="config-item">
                <div className="config-item-label">Bid Open</div>
                <div className="config-item-value" style={{ fontSize: 12 }}>{fmtDT(rfq.bidStartTime)}</div>
              </div>
              <div className="config-item">
                <div className="config-item-label">Original Close</div>
                <div className="config-item-value" style={{ fontSize: 12 }}>{fmtDT(rfq.bidCloseTime)}</div>
              </div>
              <div className="config-item" style={{ gridColumn: '1/-1' }}>
                <div className="config-item-label">Current Close</div>
                <div className="config-item-value text-accent" style={{ fontSize: 13 }}>{fmtDT(rfq.currentCloseTime)}</div>
              </div>
              <div className="config-item" style={{ gridColumn: '1/-1' }}>
                <div className="config-item-label">🛑 Hard Stop</div>
                <div className="config-item-value text-red" style={{ fontSize: 13 }}>{fmtDT(rfq.forcedCloseTime)}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                Extension Rules
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RuleChip active={rfq.extendOnAnyBid} label="Any Bid in Trigger Window" />
                <RuleChip active={rfq.extendOnRankChange} label="Any Rank Change" />
                <RuleChip active={rfq.extendOnL1Change} label="L1 Change" />
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="card">
            <div className="card-title flex-between">
              <span>📋 Activity Log</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{logs.length} events</span>
            </div>
            <div ref={logRef} style={{ maxHeight: 420, overflowY: 'auto' }}>
              <ActivityLog logs={logs} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Extension Toast ── */}
      {toast && (
        <div className="ext-toast">
          <div className="ext-toast-title">⏰ Auction Extended!</div>
          <div className="ext-toast-msg">
            {toast.reason}
            {toast.cappedByForcedClose && ' — capped at hard stop'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 6 }}>
            New Close: {fmtDT(toast.newCloseTime)}
          </div>
        </div>
      )}

      {/* ── War Banner ── */}
      {warring && (
        <div className="war-banner">
          ⚔️ <strong>BIDDING WAR IN PROGRESS</strong> — 5 suppliers are competing in real time!
        </div>
      )}
    </div>
  );
}

function LiveIndicator({ connected }) {
  return (
    <span className={`live-indicator ${connected ? '' : 'disconnected'}`}>
      <span className="live-dot" />
      {connected ? 'LIVE' : 'RECONNECTING'}
    </span>
  );
}

function ViewersChip({ count }) {
  return (
    <span className="viewers-chip">
      👁 {count} viewing
    </span>
  );
}

function RuleChip({ active, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: active ? 'var(--green)' : 'var(--text-muted)' }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: active ? 'var(--green-bg)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
        {active ? '✓' : '–'}
      </span>
      {label}
    </div>
  );
}
