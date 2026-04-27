const http = require('http');

const body = JSON.stringify({
  rfqId: 'RFQ-TEST-001',
  name: 'Mumbai to Singapore Sea Freight',
  serviceDate: '2026-05-20',
  bidStartTime: new Date(Date.now() - 5 * 60000).toISOString(), // started 5 min ago
  bidCloseTime: new Date(Date.now() + 30 * 60000).toISOString(), // closes in 30 min
  forcedCloseTime: new Date(Date.now() + 60 * 60000).toISOString(), // hard stop in 60 min
  triggerWindowMinutes: 5,
  extensionDurationMinutes: 5,
  extendOnAnyBid: true,
  extendOnRankChange: false,
  extendOnL1Change: false,
});

const opts = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/rfqs',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
};

const req = http.request(opts, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    const rfq = JSON.parse(data);
    console.log('✅ RFQ Created:', JSON.stringify(rfq, null, 2));

    if (rfq._id) {
      // Place two test bids
      placeBid(rfq._id, 'Maersk Logistics', 50000, 8000, 12000, 7);
    }
  });
});
req.on('error', (e) => console.error('❌ Error:', e.message));
req.write(body);
req.end();

function placeBid(rfqId, supplier, freight, origin, dest, transit) {
  const bidBody = JSON.stringify({
    rfqId,
    supplierName: supplier,
    freightCharges: freight,
    originCharges: origin,
    destinationCharges: dest,
    transitTime: transit,
    quoteValidity: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  const opts = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/bids',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bidBody) },
  };

  const req = http.request(opts, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const result = JSON.parse(data);
      console.log(`✅ Bid by "${supplier}": Total=₹${result.totalBid}, Rank=L${result.rank}, Extension=${JSON.stringify(result.extension)}`);

      // Second bid by a different supplier, lower price
      if (supplier === 'Maersk Logistics') {
        setTimeout(() => placeBid(rfqId, 'DHL Express', 45000, 7500, 10000, 8), 500);
      }
    });
  });
  req.on('error', (e) => console.error('❌ Bid error:', e.message));
  req.write(bidBody);
  req.end();
}
