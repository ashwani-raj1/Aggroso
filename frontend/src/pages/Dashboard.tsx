import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export function Dashboard() {
  const [filter, setFilter] = useState("ALL");
  const listings = useQuery({
    queryKey: ["listings"],
    queryFn: api.listListings,
    refetchInterval: (query) => query.state.data?.some((item) => item.status === "PENDING" || item.status === "REVIEWING") ? 2000 : false
  });
  const data = listings.data ?? [];
  const visible = filter === "ALL" ? data : data.filter((item) => item.status === filter);
  const statusLabel = (status: string) => status === "REVIEWING" ? "EVALUATING" : status.replaceAll("_", " ");

  return (
    <section>
      <header className="page-header">
        <div><p className="eyebrow">Review operations</p><h1>Listing quality dashboard</h1><p>Validate listings, review cited findings, and keep every decision traceable.</p></div>
        <Link className="button primary" to="/listings/new">Create listing</Link>
      </header>

      <div className="metrics">
        <article><span>Total listings</span><strong>{data.length}</strong></article>
        <article><span>Needs changes</span><strong>{data.filter((item) => item.status === "NEEDS_CHANGES").length}</strong></article>
        <article><span>Approved</span><strong>{data.filter((item) => item.status === "APPROVED").length}</strong></article>
        <article><span>Failed</span><strong>{data.filter((item) => item.status === "FAILED").length}</strong></article>
      </div>

      <div className="panel">
        <div className="panel-heading"><div><h2>Recent listings</h2><p>Latest submissions and their review state.</p></div></div>
        <div className="filter-bar">{["ALL", "PENDING", "REVIEWING", "NEEDS_CHANGES", "APPROVED", "FAILED"].map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{statusLabel(status)} <span>{status === "ALL" ? data.length : data.filter((item) => item.status === status).length}</span></button>)}</div>
        {listings.isLoading && <div className="state">Loading listings…</div>}
        {listings.isError && <div className="state error">Could not load listings. {listings.error.message}</div>}
        {!listings.isLoading && !listings.isError && data.length === 0 && (
          <div className="empty"><div className="empty-icon">◎</div><h3>No listings yet</h3><p>Create your first listing to begin policy review.</p><Link className="button" to="/listings/new">Add a listing</Link></div>
        )}
        {data.length > 0 && visible.length === 0 && <div className="empty compact"><h3>No listings in this status</h3><p>Choose another status to see available listings.</p></div>}
        {visible.length > 0 && <div className="listing-grid">{visible.map((listing) => (
          <Link className="listing-card" to={`/listings/${listing.id}`} key={listing.id}>
            {listing.imageUrl ? <img className="listing-thumb" src={listing.imageUrl} alt="" /> : <div className="listing-placeholder">{listing.title.slice(0, 1).toUpperCase()}</div>}
            <div className="listing-copy"><span className={`status status-${listing.status.toLowerCase()}`}>{statusLabel(listing.status)}</span><h3>{listing.title}</h3><p>{listing.category.replaceAll("_", " ")} · {listing.seller}</p></div>
            <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(listing.price))}</strong>
          </Link>
        ))}</div>}
      </div>
    </section>
  );
}
