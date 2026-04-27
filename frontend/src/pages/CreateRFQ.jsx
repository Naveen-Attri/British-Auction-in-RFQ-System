import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/rfq.api.js';

// Default: auction starts 2 mins from now, closes in 32 mins, forced close in 62 mins
function defaults() {
  const now = new Date();
  const pad = (d) => d.toISOString().slice(0, 16);
  return {
    rfqId: `RFQ-${Date.now().toString().slice(-6)}`,
    name: '',
    serviceDate: pad(new Date(now.getTime() + 7 * 86400000)).slice(0, 10),
    bidStartTime: pad(new Date(now.getTime() + 2 * 60000)),
    bidCloseTime: pad(new Date(now.getTime() + 32 * 60000)),
    forcedCloseTime: pad(new Date(now.getTime() + 62 * 60000)),
    triggerWindowMinutes: '5',
    extensionDurationMinutes: '5',
    extendOnAnyBid: true,
    extendOnRankChange: false,
    extendOnL1Change: false,
  };
}

export default function CreateRFQ() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaults());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handle(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Client-side validation
    if (!form.extendOnAnyBid && !form.extendOnRankChange && !form.extendOnL1Change) {
      setError('At least one extension rule must be enabled.');
      return;
    }

    setLoading(true);
    try {
      const rfq = await api.createRFQ({
        ...form,
        triggerWindowMinutes: Number(form.triggerWindowMinutes),
        extensionDurationMinutes: Number(form.extensionDurationMinutes),
      });
      navigate(`/rfq/${rfq._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div className="page-header">
        <h1>Create New RFQ</h1>
        <p>Configure your British Auction — suppliers will underbid each other in real time.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        {/* Section 1: RFQ Info */}
        <div className="card section-gap">
          <div className="card-title">📋 RFQ Information</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="rfqId">RFQ ID</label>
              <input
                id="rfqId"
                name="rfqId"
                className="form-input"
                value={form.rfqId}
                onChange={handle}
                required
                placeholder="e.g. RFQ-2024-001"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="serviceDate">Service Date</label>
              <input
                id="serviceDate"
                name="serviceDate"
                type="date"
                className="form-input"
                value={form.serviceDate}
                onChange={handle}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="name">RFQ Name / Description</label>
              <input
                id="name"
                name="name"
                className="form-input"
                value={form.name}
                onChange={handle}
                required
                placeholder="e.g. Mumbai to Singapore Sea Freight Q2-2024"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Auction Timing */}
        <div className="card section-gap">
          <div className="card-title">⏱️ Auction Timing</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="bidStartTime">Bid Start Time</label>
              <input
                id="bidStartTime"
                name="bidStartTime"
                type="datetime-local"
                className="form-input"
                value={form.bidStartTime}
                onChange={handle}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bidCloseTime">Bid Close Time</label>
              <input
                id="bidCloseTime"
                name="bidCloseTime"
                type="datetime-local"
                className="form-input"
                value={form.bidCloseTime}
                onChange={handle}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label" htmlFor="forcedCloseTime">
                🛑 Forced Close Time (Hard Stop)
              </label>
              <input
                id="forcedCloseTime"
                name="forcedCloseTime"
                type="datetime-local"
                className="form-input"
                value={form.forcedCloseTime}
                onChange={handle}
                required
              />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                Auction will NEVER extend beyond this time, regardless of activity.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Extension Config */}
        <div className="card section-gap">
          <div className="card-title">🔧 Extension Configuration</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="triggerWindowMinutes">
                Trigger Window (minutes)
              </label>
              <input
                id="triggerWindowMinutes"
                name="triggerWindowMinutes"
                type="number"
                min="1"
                className="form-input"
                value={form.triggerWindowMinutes}
                onChange={handle}
                required
              />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Bids in the last X minutes trigger an extension.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="extensionDurationMinutes">
                Extension Duration (minutes)
              </label>
              <input
                id="extensionDurationMinutes"
                name="extensionDurationMinutes"
                type="number"
                min="1"
                className="form-input"
                value={form.extensionDurationMinutes}
                onChange={handle}
                required
              />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Each triggered extension adds Y minutes to current close.
              </span>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Extension Rules (select at least one)</label>
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="extendOnAnyBid"
                    checked={form.extendOnAnyBid}
                    onChange={handle}
                    id="extendOnAnyBid"
                  />
                  <span>
                    <strong>Any Bid</strong> — Extend whenever any bid is placed in the trigger window
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                      Recommended: most competitive, constant pressure
                    </span>
                  </span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="extendOnRankChange"
                    checked={form.extendOnRankChange}
                    onChange={handle}
                    id="extendOnRankChange"
                  />
                  <span>
                    <strong>Rank Change</strong> — Extend when any supplier's rank changes in trigger window
                  </span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="extendOnL1Change"
                    checked={form.extendOnL1Change}
                    onChange={handle}
                    id="extendOnL1Change"
                  />
                  <span>
                    <strong>L1 Change</strong> — Extend only when the lowest bidder (L1) changes
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-between" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
          <button
            id="create-rfq-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? '⏳ Creating...' : '🚀 Launch Auction'}
          </button>
        </div>
      </form>
    </div>
  );
}
