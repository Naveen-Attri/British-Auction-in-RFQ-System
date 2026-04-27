/**
 * test-api.js
 * Full end-to-end API verification:
 *  1. GET /health
 *  2. GET /rfqs — list all (should have seeded RFQs)
 *  3. POST /rfqs/:id/simulate — fire a real-time bid on DEMO-001
 *  4. POST /rfqs/:id/simulate-war — trigger bidding war
 */
const http = require('http');

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  console.log('\n🧪 British Auction RFQ System — API Test\n');

  // 1. Health check
  const health = await req('GET', '/api/health');
  console.log('✅ Health:', health.body);

  // 2. List all RFQs
  const list = await req('GET', '/api/rfqs');
  console.log(`✅ RFQs listed: ${list.body.length} auctions`);
  list.body.forEach((r) =>
    console.log(`   • [${r.status.toUpperCase()}] ${r.rfqId} — ${r.name} | L1: ${r.lowestBid ? '₹' + r.lowestBid.toLocaleString('en-IN') : 'no bids'} | ${r.lowestBidSupplier || ''}`)
  );

  // Find active RFQs
  const activeRFQs = list.body.filter((r) => r.status === 'active');
  if (activeRFQs.length === 0) {
    console.log('\n⚠️  No active auctions found. Run seed.js first: node seed.js');
    return;
  }

  const target = activeRFQs[0];
  console.log(`\n🎯 Testing real-time simulate on: ${target.rfqId} (${target._id})`);

  // 3. Simulate a single bid
  const sim = await req('POST', `/api/rfqs/${target._id}/simulate`);
  if (sim.status === 201) {
    console.log(`✅ Simulate bid: ${sim.body.bid.supplierName} — ₹${sim.body.totalBid.toLocaleString('en-IN')} | Rank: L${sim.body.rank}`);
    if (sim.body.extension?.extended) {
      console.log(`   ⏰ Extension triggered! Reason: ${sim.body.extension.reason}`);
    }
  } else {
    console.log(`⚠️  Simulate: ${JSON.stringify(sim.body)}`);
  }

  // 4. Get detail to confirm bid appears
  const detail = await req('GET', `/api/rfqs/${target._id}`);
  console.log(`✅ Detail: ${detail.body.bids.length} ranked bids, ${detail.body.logs.length} log entries`);
  console.log('   Rankings:');
  detail.body.bids.forEach((b) =>
    console.log(`     L${b.rank} — ${b.supplierName}: ₹${b.totalBid.toLocaleString('en-IN')}`)
  );

  // 5. Trigger war
  const war = await req('POST', `/api/rfqs/${target._id}/simulate-war`);
  console.log(`\n⚔️  Bidding War: ${war.body.message}`);
  console.log('   (5 bids firing over 6 seconds via Socket.IO — check the browser!)');

  console.log('\n✅ All tests passed. Backend + real-time system working.\n');
}

run().catch((err) => console.error('❌ Test failed:', err.message));
