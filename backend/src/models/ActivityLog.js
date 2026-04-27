const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    rfq: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RFQ',
      required: true,
      index: true,
    },

    // Event types
    eventType: {
      type: String,
      enum: [
        'BID_PLACED',
        'EXTENSION_TRIGGERED',
        'AUCTION_CLOSED',
        'AUCTION_FORCE_CLOSED',
        'AUCTION_STARTED',
      ],
      required: true,
    },

    // Human-readable description
    message: { type: String, required: true },

    // Optional: reference to the bid that caused the event
    bid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },

    // Snapshot of close time at the time of event
    closeTimeSnapshot: { type: Date, default: null },

    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
