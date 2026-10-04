import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";

export function Dashboard() {
  const listings = useQuery({ queryKey: ["listings"], queryFn: api.listListings });
  const data = listings.data ?? [];

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
        {listings.isLoading && <div className="state">Loading listings…</div>}
        {listings.isError && <div className="state error">Could not load listings. {listings.error.message}</div>}
        {!listings.isLoading && !listings.isError && data.length === 0 && (
          <div className="empty"><div className="empty-icon">◎</div><h3>No listings yet</h3><p>Create your first listing to begin policy review.</p><Link className="button" to="/listings/new">Add a listing</Link></div>
        )}
        {data.length > 0 && <div className="listing-grid">{data.map((listing) => (
          <Link className="listing-card" to={`/listings/${listing.id}`} key={listing.id}>
            <div><span className={`status status-${listing.status.toLowerCase()}`}>{listing.status.replaceAll("_", " ")}</span><h3>{listing.title}</h3><p>{listing.category.replaceAll("_", " ")} · {listing.seller}</p></div>
            <strong>${Number(listing.price).toFixed(2)}</strong>
          </Link>
        ))}</div>}
      </div>
    </section>
  );
}
