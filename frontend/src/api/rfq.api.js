const BASE = '/api';

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  createRFQ: (body) =>
    fetch(`${BASE}/rfqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse),

  getAllRFQs: () => fetch(`${BASE}/rfqs`).then(handleResponse),

  getRFQ: (id) => fetch(`${BASE}/rfqs/${id}`).then(handleResponse),

  placeBid: (body) =>
    fetch(`${BASE}/bids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse),

  // Simulate a single supplier bid (auto-undercuts L1)
  simulateBid: (id) =>
    fetch(`${BASE}/rfqs/${id}/simulate`, { method: 'POST' }).then(handleResponse),

  // Trigger 5 rapid bids — bidding war mode
  simulateWar: (id) =>
    fetch(`${BASE}/rfqs/${id}/simulate-war`, { method: 'POST' }).then(handleResponse),
};
