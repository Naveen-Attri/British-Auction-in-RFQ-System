const RFQ = require('../models/RFQ');
const { syncRFQStatus } = require('../services/auction.service');
const { placeBidOnRFQ, buildSimulatedBidData } = require('../services/bid.service');
const Bid = require('../models/Bid');
const ActivityLog = require('../models/ActivityLog');

// POST /api/bids
async function placeBid(req, res) {
  try {
    const { rfqId, supplierName, freightCharges, originCharges, destinationCharges, transitTime, quoteValidity } = req.body;

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

    await syncRFQStatus(rfq);
    if (rfq.status !== 'active') {
      return res.status(400).json({ error: `Bidding not open. Status: ${rfq.status}` });
    }

    if (Number(freightCharges) < 0 || Number(originCharges) < 0 || Number(destinationCharges) < 0) {
      return res.status(400).json({ error: 'Charges cannot be negative' });
    }

    const result = await placeBidOnRFQ(rfq, {
      supplierName, freightCharges, originCharges, destinationCharges, transitTime, quoteValidity,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { placeBid };
