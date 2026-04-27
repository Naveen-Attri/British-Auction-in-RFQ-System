import { useState } from 'react';
import { api } from '../api/rfq.api.js';
import { fmtCurrency } from './helpers.jsx';

const defaultForm = {
  supplierName: '',
  freightCharges: '',
  originCharges: '',
  destinationCharges: '',
  transitTime: '',
  quoteValidity: '',
};

export default function BidForm({ rfqId, onBidPlaced }) {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total =
    (Number(form.freightCharges) || 0) +
    (Number(form.originCharges) || 0) +
    (Number(form.destinationCharges) || 0);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.supplierName.trim()) {
      setError('Supplier name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.placeBid({ rfqId, ...form });
      setForm(defaultForm);
      onBidPlaced(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="bid-form-panel" onSubmit={handleSubmit}>
      <div className="card-title">Place a Bid</div>

      {error && <div className="error-msg">{error}</div>}

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <div className="form-group full-width">
          <label className="form-label">Supplier Name</label>
          <input
            id="bid-supplier"
            name="supplierName"
            className="form-input"
            placeholder="e.g. Maersk Logistics"
            value={form.supplierName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Freight Charges (₹)</label>
          <input
            id="bid-freight"
            name="freightCharges"
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            placeholder="0.00"
            value={form.freightCharges}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Origin Charges (₹)</label>
          <input
            id="bid-origin"
            name="originCharges"
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            placeholder="0.00"
            value={form.originCharges}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Destination Charges (₹)</label>
          <input
            id="bid-dest"
            name="destinationCharges"
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            placeholder="0.00"
            value={form.destinationCharges}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Transit Time (days)</label>
          <input
            id="bid-transit"
            name="transitTime"
            type="number"
            min="1"
            className="form-input"
            placeholder="e.g. 7"
            value={form.transitTime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group full-width">
          <label className="form-label">Quote Validity Date</label>
          <input
            id="bid-validity"
            name="quoteValidity"
            type="date"
            className="form-input"
            value={form.quoteValidity}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Live total preview */}
      <div className="total-preview" style={{ marginBottom: 16 }}>
        <span className="total-preview-label">Total Bid Amount</span>
        <span className="total-preview-value">{fmtCurrency(total)}</span>
      </div>

      <button
        id="bid-submit"
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%' }}
        disabled={loading}
      >
        {loading ? '⏳ Submitting...' : '⚡ Submit Bid'}
      </button>
    </form>
  );
}
