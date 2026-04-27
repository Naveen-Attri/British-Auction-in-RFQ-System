require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const rfqRoutes = require('./routes/rfq.routes');
const bidRoutes = require('./routes/bid.routes');
const { init: initSocket } = require('./socket');
const { syncRFQStatus } = require('./services/auction.service');
const RFQ = require('./models/RFQ');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/rfqs', rfqRoutes);
app.use('/api/bids', bidRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// Wrap Express in a plain HTTP server so Socket.IO can share it
const server = http.createServer(app);
const io = initSocket(server);

/**
 * Status Sync Job — runs every 30 seconds.
 * Checks all upcoming/active auctions and emits status change events
 * if any auction has naturally closed or force-closed.
 */
async function statusSyncJob() {
  try {
    const rfqs = await RFQ.find({ status: { $in: ['upcoming', 'active'] } });
    for (const rfq of rfqs) {
      const oldStatus = rfq.status;
      await syncRFQStatus(rfq);
      if (rfq.status !== oldStatus) {
        // Notify viewers of this specific auction
        io.to(`rfq:${rfq._id}`).emit('auction:status', {
          rfqId: rfq._id,
          status: rfq.status,
        });
        // Notify the global room (RFQ list page)
        io.emit('rfq:status_update', {
          rfqId: rfq._id,
          status: rfq.status,
        });
        console.log(`⏰ RFQ ${rfq.rfqId}: ${oldStatus} → ${rfq.status}`);
      }
    }
  } catch (err) {
    console.error('Status sync error:', err.message);
  }
}

async function startServer() {
  let mongoUri = process.env.MONGO_URI;

  const connected = await mongoose
    .connect(mongoUri, { serverSelectionTimeoutMS: 3000 })
    .then(() => true)
    .catch(() => false);

  if (!connected) {
    console.log('⚠️  No external MongoDB — starting in-memory database...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const memServer = await MongoMemoryServer.create();
    mongoUri = memServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✅ In-memory MongoDB started (data resets on restart)');
    console.log('   Set MONGO_URI in backend/.env for persistence.');
  } else {
    console.log('✅ MongoDB connected:', mongoUri);
  }

  // Run status sync every 30 seconds
  setInterval(statusSyncJob, 30000);

  server.listen(process.env.PORT || 5000, () =>
    console.log(`🚀 Server running on http://localhost:${process.env.PORT || 5000}`)
  );
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
