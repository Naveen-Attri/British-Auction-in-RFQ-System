# AuctionRFQ — British Auction Based RFQ System

> A real-time, competitive procurement platform that lets suppliers openly underbid each other using a British Auction format. It features live WebSocket updates, automatic auction extensions, and a hard-stop forced close mechanism to keep things moving smoothly.

---

## Demo / Live Link

> **Live Deployment:** [https://british-auction-demo.vercel.app/](https://british-auction-demo.vercel.app/)

> Run locally following the [Installation Instructions](#installation-instructions) below.  
> Default URLs after setup:
> - **Frontend:** http://localhost:3000  
> - **Backend API:** http://localhost:5000/api

---

## About the Project

### The Problem
Traditional RFQ (Request for Quotation) processes can be pretty opaque. Suppliers usually submit sealed bids and have no visibility into competitor pricing, which often results in suboptimal prices for buyers and missed opportunities for competitive suppliers.

### The Solution
AuctionRFQ brings a **British Auction** model to the table:
- Suppliers can see each other's bid rankings (L1, L2, L3...) and continuously undercut.
- The auction auto-extends when activity happens near the closing time, preventing last-second sniping.
- A **forced close (hard stop)** ensures the auction always ends at a defined absolute deadline.
- All events are pushed to connected clients instantly via **Socket.IO WebSockets**, so there's no page refresh needed.

---

## Features

### Core Auction Engine
- **British Auction format** — open, competitive, descending price.
- **Live bid ranking** — L1 (lowest) to Ln, recalculated on every bid.
- **Per-supplier rebidding** — only the latest bid from each supplier counts.
- **Cost breakdown** — Freight + Origin + Destination charges with an auto-computed total.

### Auction Extension Logic
- **Trigger Window** — configurable X-minute window before close.
- **Extension Duration** — adds Y minutes to the current close on each trigger.
- **Three extension rules** (configurable per RFQ):
  - **Any Bid** — any bid placed within the trigger window.
  - **Rank Change** — any supplier ranking shift in the window.
  - **L1 Change** — only when the lowest bidder (L1) changes.
- **Hard Stop (Forced Close)** — the auction NEVER extends beyond this absolute deadline.

### Real-Time (Socket.IO)
- **Live bid table updates** — new bids appear instantly with a blue flash animation.
- **Extension toasts** — amber notification when auction time is extended.
- **Status sync** — `upcoming → active → closed → force_closed` pushed to all viewers.
- **Viewer count** — live count of users watching the same auction room.
- **LIVE indicator** — green pulsing dot when the WebSocket is connected.

### Demo / Testing Tools
- **Simulate Bid** — fires one random supplier bid that auto-undercuts the current L1.
- **Bidding War** — triggers 5 rapid bids staggered over 6 seconds.
- **Seed script** — creates 3 realistic demo RFQs with initial bids.

### Pages
- **RFQ List** — grid of all auctions, L1 prices update live without a refresh.
- **RFQ Detail** — live bid rankings, bid form, config panel, scrollable activity log.
- **Create RFQ** — full config form with validation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Vite 5 |
| **Styling** | Vanilla CSS — premium dark theme with design tokens |
| **Real-time** | Socket.IO (client + server) |
| **Backend** | Node.js, Express 4 |
| **Database** | MongoDB via Mongoose (auto in-memory fallback via `mongodb-memory-server`) |
| **Dev Server** | nodemon |
| **API Style** | REST + WebSocket events |

---

## Installation Instructions

### Prerequisites
- **Node.js v18+** — [Download](https://nodejs.org/)
- **MongoDB** *(optional)* — if not installed, an in-memory DB starts automatically.

### 1. Clone / Download the project

```bash
git clone <your-repo-url>
cd "British Auction in RFQ System"
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## Environment Variables

Create or edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/rfq_auction
NODE_ENV=development
```

> **If MongoDB is not installed locally**, the backend automatically starts an in-memory MongoDB instance.  
> Data will reset on every backend restart. Set `MONGO_URI` to a real MongoDB URI for persistence.

**MongoDB Atlas (cloud) example:**
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/rfq_auction
```

---

## Usage / How to Run

### Option A — Manual (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
node node_modules\nodemon\bin\nodemon.js src/server.js
```

**Terminal 2 — Frontend:**
```bash
cd frontend
node node_modules\vite\bin\vite.js --port 3000
```

### Option B — One-click (Windows)

Double-click **`start.bat`** in the project root. It'll open both servers in separate windows and launch the browser automatically.

### Seed Demo Data (optional but recommended)

After the backend is running:
```bash
cd backend
node seed.js
```

This creates **3 demo RFQs**:
- `DEMO-001` — Active auction (Mumbai → Singapore, closes in ~30 min)
- `DEMO-002` — Upcoming auction (Chennai → Rotterdam, starts in ~10 min)  
- `DEMO-003` — Active auction (Delhi → Dubai, wider trigger window)

### Access the App

| URL | Description |
|---|---|
| http://localhost:3000 | Main app (all auctions) |
| http://localhost:3000/create | Create new RFQ |
| http://localhost:5000/api/health | Backend health check |

---

## API Endpoints

### RFQ Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/rfqs` | Create a new RFQ auction |
| `GET` | `/api/rfqs` | List all RFQs with L1 bid summary |
| `GET` | `/api/rfqs/:id` | Full RFQ detail — bids, rankings, activity log |
| `POST` | `/api/rfqs/:id/simulate` | Place one simulated supplier bid (auto-undercuts L1) |
| `POST` | `/api/rfqs/:id/simulate-war` | Trigger 5 rapid bids over 6 seconds |

### Bid Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/bids` | Place a real supplier bid |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check → `{ "status": "OK" }` |

### Socket.IO Events

**Server → Client (emitted to RFQ room `rfq:{id}`):**

| Event | Payload | Description |
|---|---|---|
| `bid:new` | `{ bid, rankedBids, currentCloseTime, logEntry }` | New bid placed |
| `auction:extended` | `{ reason, newCloseTime, cappedByForcedClose }` | Auction time extended |
| `auction:status` | `{ rfqId, status }` | Status changed |
| `room:viewers` | `{ rfqId, count }` | Viewer count updated |

**Server → All clients (global):**

| Event | Payload | Description |
|---|---|---|
| `rfq:l1_update` | `{ rfqId, lowestBid, lowestBidSupplier, currentCloseTime }` | L1 price changed |
| `rfq:status_update` | `{ rfqId, status }` | Any RFQ status changed |

**Client → Server:**

| Event | Payload | Description |
|---|---|---|
| `join:rfq` | `rfqId` | Subscribe to an RFQ room |
| `leave:rfq` | `rfqId` | Unsubscribe from an RFQ room |

### Create RFQ — Request Body

```json
{
  "rfqId": "RFQ-2026-001",
  "name": "Mumbai to Singapore Sea Freight",
  "serviceDate": "2026-05-20",
  "bidStartTime": "2026-04-27T10:00:00.000Z",
  "bidCloseTime": "2026-04-27T10:30:00.000Z",
  "forcedCloseTime": "2026-04-27T11:00:00.000Z",
  "triggerWindowMinutes": 5,
  "extensionDurationMinutes": 5,
  "extendOnAnyBid": true,
  "extendOnRankChange": false,
  "extendOnL1Change": false
}
```

### Place Bid — Request Body

```json
{
  "rfqId": "<MongoDB _id of the RFQ>",
  "supplierName": "Maersk Logistics",
  "freightCharges": 50000,
  "originCharges": 8000,
  "destinationCharges": 10000,
  "transitTime": 7,
  "quoteValidity": "2026-06-01"
}
```

---

## Project Structure

```
British Auction in RFQ System/
│
├── start.bat                     ← One-click Windows startup script
├── seed-demo.bat                 ← One-click demo data seeder
│
├── backend/
│   ├── .env                      ← Environment config (PORT, MONGO_URI)
│   ├── package.json
│   ├── seed.js                   ← Creates 3 demo RFQs with initial bids
│   ├── test-api.js               ← Full API smoke test
│   └── src/
│       ├── server.js             ← Express app + HTTP server + Socket.IO init
│       │                            + 30s status sync job + in-memory DB fallback
│       ├── socket.js             ← Socket.IO singleton (init + getIO + room tracking)
│       │
│       ├── models/
│       │   ├── RFQ.js            ← RFQ schema (timing, config, status, extension rules)
│       │   ├── Bid.js            ← Bid schema (charges, rank, isLatest flag)
│       │   └── ActivityLog.js    ← Audit trail (BID_PLACED, EXTENSION_TRIGGERED, etc.)
│       │
│       ├── controllers/
│       │   ├── rfq.controller.js ← createRFQ, getAllRFQs, getRFQById, simulateBid, simulateWar
│       │   └── bid.controller.js ← placeBid (delegates to bid.service)
│       │
│       ├── routes/
│       │   ├── rfq.routes.js     ← GET/POST /rfqs, POST /rfqs/:id/simulate, /simulate-war
│       │   └── bid.routes.js     ← POST /bids
│       │
│       └── services/
│           ├── auction.service.js  ← recalculateRanks(), evaluateExtension(), syncRFQStatus()
│           └── bid.service.js      ← placeBidOnRFQ() + buildSimulatedBidData() + socket emit
│
└── frontend/
    ├── index.html                ← HTML entry (Inter font, meta tags)
    ├── vite.config.js            ← Vite config + proxy /api → localhost:5000
    ├── package.json
    └── src/
        ├── main.jsx              ← React entry point
        ├── App.jsx               ← Router + Navbar layout
        ├── index.css             ← Complete dark theme design system
        ├── socket.js             ← Socket.IO client singleton
        │
        ├── api/
        │   └── rfq.api.js        ← Fetch wrapper (createRFQ, getAllRFQs, getRFQ, placeBid,
        │                             simulateBid, simulateWar)
        │
        ├── hooks/
        │   └── useAuctionSocket.js  ← useSocketStatus(), useAuctionSocket(), useRFQListSocket()
        │
        ├── components/
        │   ├── helpers.jsx       ← StatusBadge, RankBadge, fmtDT, fmtCurrency, eventIcon
        │   ├── Countdown.jsx     ← Live countdown timer (urgent mode < 5 min)
        │   ├── ActivityLog.jsx   ← Event log with colored icons per event type
        │   └── BidForm.jsx       ← Supplier bid form with live total preview
        │
        └── pages/
            ├── RFQList.jsx       ← Auction grid — real-time L1 + status via socket
            ├── RFQDetail.jsx     ← Full detail: live bid table, simulate buttons,
            │                         viewers chip, extension toast, war banner
            └── CreateRFQ.jsx     ← RFQ creation form with all config fields
```

---

## Core Auction Logic

### Extension Decision Flow

```
New Bid Arrives
      |
      ▼
Is status = 'active'?  --No--> Reject (400)
      | Yes
      ▼
Mark supplier's previous bid isLatest = false
Create new Bid document
      |
      ▼
recalculateRanks()
  Sort all (isLatest = true) bids by totalBid ASC
  Assign rank 1, 2, 3... (L1 = lowest)
      |
      ▼
evaluateExtension():
  minutesUntilClose = (currentCloseTime - now) / 60000
  withinWindow = minutesUntilClose ≤ triggerWindowMinutes?
      |
      |-- NO  --> No extension
      |
      +-- YES --> Check rules (priority order):
                    1. extendOnAnyBid     → always fires
                    2. extendOnL1Change   → fires if L1 supplier changed
                    3. extendOnRankChange → fires if bid displaced another
                         |
                         ▼
                    newCloseTime = currentCloseTime + extensionDurationMinutes
                         |
                         ▼
                    HARD CAP: if newCloseTime > forcedCloseTime
                                  newCloseTime = forcedCloseTime
                         |
                         ▼
                    Save + emit auction:extended via Socket.IO
```

### Status State Machine

```
[upcoming] --bidStartTime reached--> [active]
[active]   --currentCloseTime passed--> [closed]
[any]      --forcedCloseTime passed--> [force_closed]

closed / force_closed = TERMINAL (never reverts)
```

---

## Contributing Guidelines

1. **Fork** the repository.
2. **Create a feature branch:** `git checkout -b feature/your-feature-name`
3. **Commit** with clear messages: `git commit -m "feat: add email notification on auction close"`
4. **Push** to your fork: `git push origin feature/your-feature-name`
5. **Open a Pull Request** with a brief description of the change.

### Code Style
- Use `camelCase` for variables and functions.
- Keep controllers thin — business logic belongs in `services/`.
- All socket emissions go through `bid.service.js` or `auction.service.js`.
- CSS changes go in `index.css` using the existing design token variables.

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## Author / Contact

**Name:** Naveen Attri
**Built with:** Node.js · Express · MongoDB · React · Socket.IO  

> Feel free to open an issue or pull request if you spot any bugs, have feature ideas, or just want to suggest improvements.

---

## Acknowledgements

- [Socket.IO](https://socket.io/) — for the excellent real-time WebSocket library.
- [Mongoose](https://mongoosejs.com/) — for elegant MongoDB object modeling.
- [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) — handy zero-install MongoDB for local dev.
- [Vite](https://vitejs.dev/) — blazing fast frontend tooling.
- [React Router](https://reactrouter.com/) — declarative routing for React.
- [Inter Font](https://fonts.google.com/specimen/Inter) — clean, readable UI typography.

---

## Future Improvements / Roadmap

### Near-term
- [ ] **User Authentication** — JWT-based login for buyers and suppliers; each supplier sees only their own bids initially.
- [ ] **Email Notifications** — notify suppliers when they lose L1, and buyers when an auction closes.
- [ ] **Persistent Storage** — MongoDB Atlas cloud setup guide + Docker Compose file.
- [ ] **Admin Dashboard** — buyer view to manage all RFQs, export bid history to CSV/Excel.

### Medium-term
- [ ] **Multiple Items per RFQ** — line-item bidding with individual rankings per item.
- [ ] **Reserve Price** — hidden floor price; auction only awards if L1 is below reserve.
- [ ] **Supplier Whitelist** — invite-only auctions; only approved suppliers can bid.
- [ ] **Mobile Responsive** — full mobile layout optimization.
- [ ] **Dark / Light Mode Toggle** — user preference persisted in localStorage.

### Long-term
- [ ] **Analytics Dashboard** — bid velocity charts, extension frequency, savings vs. baseline.
- [ ] **AI Price Suggestion** — suggest a competitive bid based on historical data.
- [ ] **Multi-currency Support** — USD, EUR, INR, etc. with live conversion.
- [ ] **Audit Export** — full activity log export as PDF report for procurement compliance.
- [ ] **Webhook Integration** — POST to external ERP/SCM systems on auction close.

---

*Built for modern procurement teams who want transparent, competitive, and time-efficient sourcing.*
