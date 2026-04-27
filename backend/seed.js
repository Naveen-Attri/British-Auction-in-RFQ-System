/**
 * seed.js — Create a demo active RFQ for testing real-time features.
 * Run: node seed.js
 */
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost', port: 5000, path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(JSON.parse(d)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function seed() {
  const now = new Date();

  // RFQ 1: Active right now (closes in 30 minutes, hard stop 1 hour)
  const rfq1 = await post('/api/rfqs', {
    rfqId: 'DEMO-001',
    name: 'Mumbai → Singapore Sea Freight Q2 2026',
    serviceDate: new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10),
    bidStartTime: new Date(now.getTime() - 5 * 60000).toISOString(),   // started 5 min ago
    bidCloseTime: new Date(now.getTime() + 30 * 60000).toISOString(),  // closes in 30 min
    forcedCloseTime: new Date(now.getTime() + 60 * 60000).toISOString(), // hard stop 60 min
    triggerWindowMinutes: 5,
    extensionDurationMinutes: 5,
    extendOnAnyBid: true,
    extendOnRankChange: false,
    extendOnL1Change: false,
  });
  console.log('✅ Created:', rfq1.rfqId, '—', rfq1._id);

  // RFQ 2: Upcoming in 10 minutes
  const rfq2 = await post('/api/rfqs', {
    rfqId: 'DEMO-002',
    name: 'Chennai → Rotterdam Air Cargo Tender',
    serviceDate: new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10),
    bidStartTime: new Date(now.getTime() + 10 * 60000).toISOString(),
    bidCloseTime: new Date(now.getTime() + 40 * 60000).toISOString(),
    forcedCloseTime: new Date(now.getTime() + 70 * 60000).toISOString(),
    triggerWindowMinutes: 3,
    extensionDurationMinutes: 3,
    extendOnAnyBid: false,
    extendOnRankChange: false,
    extendOnL1Change: true,
  });
  console.log('✅ Created:', rfq2.rfqId, '—', rfq2._id);

  // RFQ 3: Active, trigger window = 10 min, any bid rule
  const rfq3 = await post('/api/rfqs', {
    rfqId: 'DEMO-003',
    name: 'Delhi → Dubai Express Freight Tender',
    serviceDate: new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 10),
    bidStartTime: new Date(now.getTime() - 2 * 60000).toISOString(),
    bidCloseTime: new Date(now.getTime() + 25 * 60000).toISOString(),
    forcedCloseTime: new Date(now.getTime() + 55 * 60000).toISOString(),
    triggerWindowMinutes: 10,
    extensionDurationMinutes: 5,
    extendOnAnyBid: true,
    extendOnRankChange: true,
    extendOnL1Change: false,
  });
  console.log('✅ Created:', rfq3.rfqId, '—', rfq3._id);

  // Place initial bids on DEMO-001 and DEMO-003 to populate leaderboard
  const bids = [
    { rfqId: rfq1._id, supplierName: 'Maersk Logistics', freightCharges: 52000, originCharges: 8000, destinationCharges: 10000, transitTime: 7, quoteValidity: '2026-06-01' },
    { rfqId: rfq1._id, supplierName: 'Hapag-Lloyd', freightCharges: 49000, originCharges: 7500, destinationCharges: 9500, transitTime: 8, quoteValidity: '2026-06-01' },
    { rfqId: rfq1._id, supplierName: 'CMA CGM', freightCharges: 47000, originCharges: 7000, destinationCharges: 9000, transitTime: 9, quoteValidity: '2026-06-01' },
    { rfqId: rfq3._id, supplierName: 'DHL Express', freightCharges: 35000, originCharges: 6000, destinationCharges: 8000, transitTime: 3, quoteValidity: '2026-06-01' },
    { rfqId: rfq3._id, supplierName: 'FedEx Freight', freightCharges: 33000, originCharges: 5500, destinationCharges: 7500, transitTime: 4, quoteValidity: '2026-06-01' },
  ];

  for (const bid of bids) {
    await new Promise((r) => setTimeout(r, 200));
    const result = await post('/api/bids', bid);
    console.log(`  💰 ${bid.supplierName}: ₹${result.totalBid.toLocaleString('en-IN')} → Rank L${result.rank}`);
  }

  console.log('\n🎉 Seed complete! Open http://localhost:3000 to see the live auctions.');
  console.log(`   DEMO-001 detail: http://localhost:3000/rfq/${rfq1._id}`);
}

seed().catch(console.error);
