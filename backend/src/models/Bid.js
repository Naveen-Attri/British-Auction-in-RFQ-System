const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    rfq: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RFQ',
      required: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },

    // Cost breakdown
    freightCharges: { type: Number, required: true, min: 0 },
    originCharges: { type: Number, required: true, min: 0 },
    destinationCharges: { type: Number, required: true, min: 0 },

    // Total is automatically computed
    totalBid: { type: Number, required: true },

    transitTime: { type: Number, required: true, min: 0 }, // in days
    quoteValidity: { type: Date, required: true },

    // Rank assigned after bid placement (1 = L1 = lowest)
    rank: { type: Number, default: null },

    // Whether this bid is the current active bid for this supplier
    // (a supplier can rebid; only latest counts for ranking)
    isLatest: { type: Boolean, default: true },

    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bid', bidSchema);
