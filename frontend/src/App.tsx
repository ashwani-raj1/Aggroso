import { NavLink, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { NewListing } from "./pages/NewListing";
import { ListingDetail } from "./pages/ListingDetail";
import { BatchImport } from "./pages/BatchImport";

export function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">LR</span><span>Listing Review</span></div>
        <nav>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/listings/new">New listing</NavLink>
          <NavLink to="/import">Excel import</NavLink>
        </nav>
        <div className="sidebar-note"><strong>Human reviewed</strong><span>AI suggestions are never applied automatically.</span></div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/listings/new" element={<NewListing />} />
          <Route path="/import" element={<BatchImport />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
        </Routes>
      </main>
    </div>
  );
}
