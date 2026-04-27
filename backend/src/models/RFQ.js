const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema(
  {
    rfqId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    serviceDate: {
      type: Date,
      required: true,
    },
    bidStartTime: {
      type: Date,
      required: true,
    },
    bidCloseTime: {
      type: Date,
      required: true,
    },
    forcedCloseTime: {
      type: Date,
      required: true,
    },

    // Auction Extension Configuration
    triggerWindowMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    extensionDurationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },

    // Extension trigger rules (at least one must be true)
    extendOnAnyBid: { type: Boolean, default: true },
    extendOnRankChange: { type: Boolean, default: false },
    extendOnL1Change: { type: Boolean, default: false },

    // Dynamic close time (changes on each extension)
    currentCloseTime: {
      type: Date,
      required: true,
    },

    // Status: 'upcoming' | 'active' | 'closed' | 'force_closed'
    status: {
      type: String,
      enum: ['upcoming', 'active', 'closed', 'force_closed'],
      default: 'upcoming',
    },

    // Track the current L1 supplier for change detection
    currentL1SupplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
  },
  { timestamps: true }
);

// Virtual: compute status dynamically is handled by service,
// but we store it for efficient querying.

module.exports = mongoose.model('RFQ', rfqSchema);
