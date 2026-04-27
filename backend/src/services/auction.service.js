/**
 * auction.service.js
 * Core British Auction logic:
 *   - Ranking computation
 *   - Extension trigger evaluation
 *   - Forced close enforcement
 */

const RFQ = require('../models/RFQ');
const Bid = require('../models/Bid');
const ActivityLog = require('../models/ActivityLog');

/**
 * Recalculate ranks for all latest bids on an RFQ.
 * L1 = rank 1 = lowest totalBid.
 * Returns sorted bids (ascending by totalBid).
 */
async function recalculateRanks(rfqId) {
  // Fetch only the latest bid per supplier
  const latestBids = await Bid.find({ rfq: rfqId, isLatest: true }).sort({
    totalBid: 1,
  });

  // Assign rank sequentially
  for (let i = 0; i < latestBids.length; i++) {
    latestBids[i].rank = i + 1;
    await latestBids[i].save();
  }

  return latestBids; // sorted L1 → Ln
}

/**
 * Evaluate whether the auction should be extended after a new bid.
 *
 * Extension rules (configured per RFQ):
 *   a) extendOnAnyBid   — any bid placed in last X minutes
 *   b) extendOnRankChange — any rank change in last X minutes
 *   c) extendOnL1Change   — L1 (lowest bidder) changes
 *
 * Extension NEVER pushes currentCloseTime beyond forcedCloseTime.
 *
 * @param {Object} rfq        - Mongoose RFQ document
 * @param {Object} newBid     - The newly placed Bid document
 * @param {Array}  rankedBids - Sorted bids after recalculation
 * @param {Object} prevL1Bid  - The L1 bid BEFORE this submission (can be null)
 * @returns {Object} { extended: Boolean, reason: String|null }
 */
async function evaluateExtension(rfq, newBid, rankedBids, prevL1Bid) {
  const now = new Date();
  const currentClose = new Date(rfq.currentCloseTime);
  const forcedClose = new Date(rfq.forcedCloseTime);

  // Minutes remaining until current close
  const minutesUntilClose = (currentClose - now) / 60000;

  // Check if bid was placed within the trigger window
  const withinTriggerWindow = minutesUntilClose <= rfq.triggerWindowMinutes;

  if (!withinTriggerWindow) {
    return { extended: false, reason: null };
  }

  // --- Evaluate which rule fires ---
  let shouldExtend = false;
  let reason = null;

  const newL1 = rankedBids[0]; // After reranking

  if (rfq.extendOnAnyBid) {
    shouldExtend = true;
    reason = `Bid placed by "${newBid.supplierName}" within trigger window of ${rfq.triggerWindowMinutes} min`;
  } else if (rfq.extendOnL1Change) {
    // L1 changed if the new L1 supplier is different from previous
    const prevL1Name = prevL1Bid ? prevL1Bid.supplierName : null;
    if (newL1 && newL1.supplierName !== prevL1Name) {
      shouldExtend = true;
      reason = `L1 changed from "${prevL1Name || 'none'}" to "${newL1.supplierName}"`;
    }
  } else if (rfq.extendOnRankChange) {
    // Rank change: check if the new bid displaced any existing supplier
    // Simple heuristic: if new bid's rank ≤ previous count of bids, ranks shifted
    const totalBids = rankedBids.length;
    if (newBid.rank < totalBids) {
      shouldExtend = true;
      reason = `Rank change detected — "${newBid.supplierName}" entered at rank ${newBid.rank}`;
    } else if (totalBids === 1) {
      // First bid always changes rank structure
      shouldExtend = true;
      reason = `First bid placed by "${newBid.supplierName}"`;
    }
  }

  if (!shouldExtend) {
    return { extended: false, reason: null };
  }

  // --- Calculate new close time ---
  const newClose = new Date(
    currentClose.getTime() + rfq.extensionDurationMinutes * 60000
  );

  // HARD STOP: never extend beyond forcedCloseTime
  const cappedClose = newClose > forcedClose ? forcedClose : newClose;

  // Only update if it actually moves the close time forward
  if (cappedClose <= currentClose) {
    return { extended: false, reason: null };
  }

  rfq.currentCloseTime = cappedClose;
  await rfq.save();

  // Log the extension
  await ActivityLog.create({
    rfq: rfq._id,
    eventType: 'EXTENSION_TRIGGERED',
    message: `Auction extended by ${rfq.extensionDurationMinutes} min. Reason: ${reason}. New close: ${cappedClose.toISOString()}`,
    bid: newBid._id,
    closeTimeSnapshot: cappedClose,
  });

  const wasCapped = newClose > forcedClose;
  return {
    extended: true,
    reason,
    newCloseTime: cappedClose,
    cappedByForcedClose: wasCapped,
  };
}

/**
 * Sync RFQ status based on current time.
 * Call this before returning RFQ data to ensure fresh status.
 */
async function syncRFQStatus(rfq) {
  const now = new Date();

  let newStatus = rfq.status;

  if (rfq.status === 'force_closed' || rfq.status === 'closed') {
    return rfq; // Terminal states — no change
  }

  if (now >= new Date(rfq.forcedCloseTime)) {
    newStatus = 'force_closed';
  } else if (now >= new Date(rfq.currentCloseTime)) {
    newStatus = 'closed';
  } else if (now >= new Date(rfq.bidStartTime)) {
    newStatus = 'active';
  } else {
    newStatus = 'upcoming';
  }

  if (newStatus !== rfq.status) {
    rfq.status = newStatus;
    await rfq.save();

    // Log terminal events
    if (newStatus === 'closed') {
      const exists = await ActivityLog.findOne({
        rfq: rfq._id,
        eventType: 'AUCTION_CLOSED',
      });
      if (!exists) {
        await ActivityLog.create({
          rfq: rfq._id,
          eventType: 'AUCTION_CLOSED',
          message: 'Auction closed at scheduled close time.',
          closeTimeSnapshot: rfq.currentCloseTime,
        });
      }
    } else if (newStatus === 'force_closed') {
      const exists = await ActivityLog.findOne({
        rfq: rfq._id,
        eventType: 'AUCTION_FORCE_CLOSED',
      });
      if (!exists) {
        await ActivityLog.create({
          rfq: rfq._id,
          eventType: 'AUCTION_FORCE_CLOSED',
          message: 'Auction force-closed at hard stop time.',
          closeTimeSnapshot: rfq.forcedCloseTime,
        });
      }
    }
  }

  return rfq;
}

module.exports = { recalculateRanks, evaluateExtension, syncRFQStatus };
