import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import RFQList from './pages/RFQList.jsx';
import RFQDetail from './pages/RFQDetail.jsx';
import CreateRFQ from './pages/CreateRFQ.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="navbar">
          <div className="navbar-inner">
            <NavLink to="/" className="navbar-brand">
              <span className="brand-icon">⚡</span>
              <span className="brand-text">AuctionRFQ</span>
            </NavLink>
            <nav className="navbar-links">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                All Auctions
              </NavLink>
              <NavLink to="/create" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                + New RFQ
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<RFQList />} />
            <Route path="/rfq/:id" element={<RFQDetail />} />
            <Route path="/create" element={<CreateRFQ />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>AuctionRFQ &copy; {new Date().getFullYear()} — British Auction Platform</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
