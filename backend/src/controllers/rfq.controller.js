const RFQ = require('../models/RFQ');
const Bid = require('../models/Bid');
const ActivityLog = require('../models/ActivityLog');
const { syncRFQStatus } = require('../services/auction.service');
const { placeBidOnRFQ, buildSimulatedBidData } = require('../services/bid.service');

// POST /api/rfqs
async function createRFQ(req, res) {
  try {
    const {
      rfqId, name, serviceDate, bidStartTime, bidCloseTime, forcedCloseTime,
      triggerWindowMinutes, extensionDurationMinutes,
      extendOnAnyBid, extendOnRankChange, extendOnL1Change,
    } = req.body;

    const start = new Date(bidStartTime);
    const close = new Date(bidCloseTime);
    const forced = new Date(forcedCloseTime);

    if (close <= start) return res.status(400).json({ error: 'bidCloseTime must be after bidStartTime' });
    if (forced <= close) return res.status(400).json({ error: 'forcedCloseTime must be after bidCloseTime' });
    if (!extendOnAnyBid && !extendOnRankChange && !extendOnL1Change) {
      return res.status(400).json({ error: 'At least one extension rule must be enabled' });
    }

    const rfq = await RFQ.create({
      rfqId, name, serviceDate, bidStartTime: start, bidCloseTime: close,
      forcedCloseTime: forced, currentCloseTime: close,
      triggerWindowMinutes, extensionDurationMinutes,
      extendOnAnyBid: !!extendOnAnyBid,
      extendOnRankChange: !!extendOnRankChange,
      extendOnL1Change: !!extendOnL1Change,
    });

    await ActivityLog.create({
      rfq: rfq._id,
      eventType: 'AUCTION_STARTED',
      message: `RFQ "${rfq.name}" (${rfq.rfqId}) created. Opens at ${start.toISOString()}.`,
      closeTimeSnapshot: close,
    });

    res.status(201).json(rfq);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'RFQ ID already exists' });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/rfqs
async function getAllRFQs(req, res) {
  try {
    const rfqs = await RFQ.find().sort({ createdAt: -1 });
    const results = await Promise.all(
      rfqs.map(async (rfq) => {
        await syncRFQStatus(rfq);
        const lowestBid = await Bid.findOne({ rfq: rfq._id, isLatest: true })
          .sort({ totalBid: 1 })
          .select('totalBid supplierName');
        return {
          _id: rfq._id,
          rfqId: rfq.rfqId,
          name: rfq.name,
          status: rfq.status,
          bidStartTime: rfq.bidStartTime,
          currentCloseTime: rfq.currentCloseTime,
          forcedCloseTime: rfq.forcedCloseTime,
          lowestBid: lowestBid?.totalBid ?? null,
          lowestBidSupplier: lowestBid?.supplierName ?? null,
        };
      })
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/rfqs/:id
async function getRFQById(req, res) {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });
    await syncRFQStatus(rfq);
    const bids = await Bid.find({ rfq: rfq._id, isLatest: true }).sort({ rank: 1 });
    const allBids = await Bid.find({ rfq: rfq._id }).sort({ placedAt: -1 });
    const logs = await ActivityLog.find({ rfq: rfq._id }).sort({ timestamp: 1 });
    res.json({ rfq, bids, allBids, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/rfqs/:id/simulate
// Place one simulated supplier bid (auto-undercuts current L1)
async function simulateBid(req, res) {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

    await syncRFQStatus(rfq);
    if (rfq.status !== 'active') {
      return res.status(400).json({ error: `Cannot simulate: auction is "${rfq.status}"` });
    }

    const bidData = await buildSimulatedBidData(rfq._id);
    const result = await placeBidOnRFQ(rfq, bidData);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/rfqs/:id/simulate-war
// Trigger 5 rapid simulated bids to create a bidding war
async function simulateWar(req, res) {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

    await syncRFQStatus(rfq);
    if (rfq.status !== 'active') {
      return res.status(400).json({ error: `Cannot simulate: auction is "${rfq.status}"` });
    }

    // Send response immediately — bids fire asynchronously
    res.json({ message: 'Bidding war started — 5 bids incoming over 6 seconds' });

    // Fire 5 bids with staggered delays
    const delays = [300, 1200, 2400, 3800, 5500];
    for (const delay of delays) {
      setTimeout(async () => {
        try {
          // Reload rfq to get latest currentCloseTime
          const freshRFQ = await RFQ.findById(rfq._id);
          await syncRFQStatus(freshRFQ);
          if (freshRFQ.status !== 'active') return;
          const bidData = await buildSimulatedBidData(freshRFQ._id);
          await placeBidOnRFQ(freshRFQ, bidData);
        } catch (e) {
          console.error('Simulated war bid failed:', e.message);
        }
      }, delay);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createRFQ, getAllRFQs, getRFQById, simulateBid, simulateWar };
