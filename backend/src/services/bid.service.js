/**
 * bid.service.js
 * Core bid placement logic — used by both the API controller
 * and the simulate endpoint. Emits Socket.IO events after each bid.
 */

const Bid = require('../models/Bid');
const ActivityLog = require('../models/ActivityLog');
const { recalculateRanks, evaluateExtension, syncRFQStatus } = require('./auction.service');
const { getIO } = require('../socket');

// Real supplier names used for simulation
const SIMULATED_SUPPLIERS = [
  'Maersk Logistics',
  'DHL Express',
  'FedEx Freight',
  'Hapag-Lloyd',
  'MSC Cargo',
  'CMA CGM',
  'Evergreen Line',
  'COSCO Shipping',
  'ONE Line',
  'Yang Ming Marine',
];

/**
 * Place a bid on an RFQ.
 * @param {Object} rfq - Mongoose RFQ document (already loaded + status-synced)
 * @param {Object} bidData - { supplierName, freightCharges, originCharges, destinationCharges, transitTime, quoteValidity }
 * @returns {Object} { bid, rank, totalBid, extension, currentCloseTime, rankedBids }
 */
async function placeBidOnRFQ(rfq, bidData) {
  const {
    supplierName,
    freightCharges,
    originCharges,
    destinationCharges,
    transitTime,
    quoteValidity,
  } = bidData;

  const totalBid =
    Number(freightCharges) + Number(originCharges) + Number(destinationCharges);

  // Capture L1 before this bid
  const prevL1Bid = await Bid.findOne({ rfq: rfq._id, isLatest: true }).sort({
    totalBid: 1,
  });

  // Mark previous bids from same supplier as superseded
  await Bid.updateMany(
    { rfq: rfq._id, supplierName, isLatest: true },
    { isLatest: false }
  );

  // Create the bid
  const newBid = await Bid.create({
    rfq: rfq._id,
    supplierName,
    freightCharges: Number(freightCharges),
    originCharges: Number(originCharges),
    destinationCharges: Number(destinationCharges),
    totalBid,
    transitTime: Number(transitTime),
    quoteValidity: new Date(quoteValidity),
    isLatest: true,
    placedAt: new Date(),
  });

  // Recalculate ranks for all latest bids
  const rankedBids = await recalculateRanks(rfq._id);
  const updatedBid = await Bid.findById(newBid._id);

  // Log the bid event
  const logEntry = await ActivityLog.create({
    rfq: rfq._id,
    eventType: 'BID_PLACED',
    message: `"${supplierName}" placed a bid of ₹${totalBid.toLocaleString('en-IN')} (Rank: L${updatedBid.rank})`,
    bid: newBid._id,
    closeTimeSnapshot: rfq.currentCloseTime,
  });

  // Evaluate extension
  const extension = await evaluateExtension(
    rfq,
    updatedBid,
    rankedBids,
    prevL1Bid
  );

  // ── Emit real-time events ──────────────────────────────────────
  const io = getIO();
  const room = `rfq:${rfq._id}`;

  // Emit new bid to all viewers of this RFQ
  io.to(room).emit('bid:new', {
    bid: updatedBid.toObject(),
    rankedBids: rankedBids.map((b) => b.toObject()),
    currentCloseTime: rfq.currentCloseTime,
    logEntry: logEntry.toObject(),
  });

  // Emit extension event if triggered
  if (extension.extended) {
    io.to(room).emit('auction:extended', {
      rfqId: rfq._id,
      ...extension,
    });
  }

  // Broadcast L1 update to the global room (for RFQ list live update)
  io.emit('rfq:l1_update', {
    rfqId: rfq._id,
    lowestBid: rankedBids[0]?.totalBid ?? null,
    lowestBidSupplier: rankedBids[0]?.supplierName ?? null,
    currentCloseTime: rfq.currentCloseTime,
  });
  // ─────────────────────────────────────────────────────────────

  return {
    bid: updatedBid,
    rank: updatedBid.rank,
    totalBid,
    extension,
    currentCloseTime: rfq.currentCloseTime,
    rankedBids,
  };
}

/**
 * Generate a simulated bid:
 * - Random supplier from the pool
 * - Undercuts current L1 by 1–8%  (or random base if no bids yet)
 */
async function buildSimulatedBidData(rfqId) {
  const l1 = await Bid.findOne({ rfq: rfqId, isLatest: true }).sort({
    totalBid: 1,
  });

  const supplierName =
    SIMULATED_SUPPLIERS[Math.floor(Math.random() * SIMULATED_SUPPLIERS.length)];

  let baseTotal;
  if (l1) {
    // Undercut by 1-8%
    const cutPct = 0.92 + Math.random() * 0.07;
    baseTotal = Math.round(l1.totalBid * cutPct);
  } else {
    // No bids yet — random starting amount
    baseTotal = Math.round(60000 + Math.random() * 40000);
  }

  // Split total into three charges roughly 65 / 15 / 20
  const freightCharges = Math.round(baseTotal * 0.65);
  const originCharges = Math.round(baseTotal * 0.15);
  const destinationCharges = baseTotal - freightCharges - originCharges;
  const transitTime = 5 + Math.floor(Math.random() * 12);
  const quoteValidity = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  return {
    supplierName,
    freightCharges,
    originCharges,
    destinationCharges,
    transitTime,
    quoteValidity,
  };
}

module.exports = { placeBidOnRFQ, buildSimulatedBidData };
