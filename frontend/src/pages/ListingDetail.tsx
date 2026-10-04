import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import type { Finding } from "../types";

function FindingCard({ finding, reviewId, onSaved }: { finding: Finding; reviewId: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [wording, setWording] = useState(finding.suggestedWording ?? "");
  const decision = useMutation({ mutationFn: (payload: { action: "APPROVE" | "EDIT" | "REJECT"; appliedWording?: string }) => api.decideFinding(reviewId, finding.id, payload), onSuccess: onSaved });
  const latest = finding.decisions.at(-1);

  return <article className="finding-card">
    <div className="finding-top"><span className={`severity severity-${finding.severity.toLowerCase()}`}>{finding.severity}</span><span>{finding.field}</span><span>{finding.issueType.replaceAll("_", " ")}</span></div>
    <h3>{finding.explanation}</h3>
    {finding.supportingEvidence && <blockquote>“{finding.supportingEvidence}”</blockquote>}
    <button className="policy-link" type="button">Policy: {finding.policyCode}</button>
    {finding.suggestedWording && <div className="suggestion"><span>Suggested wording</span>{editing ? <textarea rows={4} value={wording} onChange={(event) => setWording(event.target.value)} /> : <p>{finding.suggestedWording}</p>}</div>}
    {latest && <p className="decision-state">Latest decision: <strong>{latest.action}</strong></p>}
    <div className="finding-actions">
      <button className="button" disabled={decision.isPending || !finding.suggestedWording} onClick={() => decision.mutate({ action: "APPROVE" })}>Approve</button>
      {editing ? <button className="button primary" disabled={decision.isPending || !wording.trim()} onClick={() => decision.mutate({ action: "EDIT", appliedWording: wording.trim() })}>Save edit</button> : <button className="button" disabled={!finding.suggestedWording} onClick={() => setEditing(true)}>Edit</button>}
      <button className="button danger" disabled={decision.isPending} onClick={() => decision.mutate({ action: "REJECT" })}>Reject</button>
    </div>
    {decision.isError && <div className="inline-error">{decision.error.message}</div>}
  </article>;
}

export function ListingDetail() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const autoReviewStarted = useRef(false);
  const listing = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.getListing(id),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === "REVIEWING" ? 1500 : false
  });
  const review = useMutation({ mutationFn: () => api.reviewListing(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listing", id] }) });
  const finalize = useMutation({ mutationFn: (reviewId: string) => api.finalizeReview(reviewId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["listing", id] }) });

  useEffect(() => {
    if (listing.data?.status !== "PENDING" || autoReviewStarted.current || review.isPending) return;
    autoReviewStarted.current = true;
    review.mutate();
  }, [listing.data?.status, review.isPending]);

  if (listing.isLoading) return <div className="state">Loading listing…</div>;
  if (listing.isError || !listing.data) return <div className="state error">Could not load this listing.</div>;
  const item = listing.data;
  const latestReview = item.reviews.at(-1);

  return (
    <section>
      <Link className="back" to="/">← Back to dashboard</Link>
      <header className="page-header">
        <div><p className="eyebrow">Listing review</p><h1>{item.title}</h1><p>{item.category.replaceAll("_", " ")} · Submitted by {item.seller}</p></div>
        <button className="button primary" onClick={() => review.mutate()} disabled={review.isPending || item.status === "REVIEWING"}>{review.isPending || item.status === "REVIEWING" ? "Reviewing…" : item.status === "FAILED" ? "Retry AI review" : "Run AI review"}</button>
      </header>
      {review.isError && <div className="state error">Review failed: {review.error.message}</div>}
      {review.isSuccess && <div className="state success">Review completed and findings were saved.</div>}
      <div className="detail-grid">
        <article className="panel"><div className="panel-heading"><h2>Original listing</h2><span className={`status status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span></div><dl><dt>Description</dt><dd>{item.description}</dd><dt>Price</dt><dd>${Number(item.price).toFixed(2)}</dd><dt>Tags</dt><dd>{item.tags.length ? item.tags.join(", ") : "None"}</dd></dl></article>
        <article className="panel"><div className="panel-heading"><h2>Review activity</h2></div>{item.reviews?.length ? <div className="timeline">{item.reviews.map((entry) => <div key={entry.id}><span className="timeline-dot"/><div><strong>{entry.status}</strong><p>{new Date(entry.createdAt).toLocaleString()}</p></div></div>)}</div> : <div className="empty compact"><h3>Not reviewed yet</h3><p>Run the AI review to retrieve relevant policies and generate findings.</p></div>}</article>
      </div>
      <div className="panel findings-panel">
        <div className="panel-heading"><div><h2>Policy findings</h2><p>Review every suggestion before it changes the revised copy.</p></div>{latestReview && <span>{latestReview.findings.length} findings</span>}</div>
        {!latestReview && <div className="empty compact"><h3>No review available</h3><p>Run the AI review to generate cited findings.</p></div>}
        {latestReview?.status === "FAILED" && <div className="state error">{latestReview.errorMessage ?? "The review failed."}</div>}
        {latestReview?.status === "COMPLETED" && latestReview.findings.length === 0 && <div className="state success">No policy or writing issues were found.</div>}
        <div className="findings-list">{latestReview?.findings.map((finding) => <FindingCard key={finding.id} finding={finding} reviewId={latestReview.id} onSaved={() => queryClient.invalidateQueries({ queryKey: ["listing", id] })} />)}</div>
        {latestReview?.status === "COMPLETED" && latestReview.findings.length > 0 && <div className="finalize-row"><button className="button primary" disabled={finalize.isPending || latestReview.findings.some((finding) => finding.decisions.length === 0)} onClick={() => finalize.mutate(latestReview.id)}>{finalize.isPending ? "Finalizing…" : "Finalize reviewed listing"}</button>{finalize.isError && <span className="inline-error">{finalize.error.message}</span>}</div>}
      </div>
    </section>
  );
}
