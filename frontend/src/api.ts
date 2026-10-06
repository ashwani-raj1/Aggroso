import type { Listing, ListingDetail, ListingInput } from "./types";

function normalizeApiBase(value: string) {
  const base = value.trim().replace(/\/+$/, "");
  return /\/api$/i.test(base) ? base : `${base}/api`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed");
  return body.data ?? body;
}

export const api = {
  listListings: () => request<Listing[]>("/listings"),
  getListing: (id: string) => request<ListingDetail>(`/listings/${id}`),
  createListing: (listing: ListingInput) => request<Listing>("/listings", { method: "POST", body: JSON.stringify(listing) }),
  createBatch: (listings: ListingInput[]) => request<{ id: string; listings: Listing[] }>("/batches", { method: "POST", body: JSON.stringify({ listings }) }),
  reviewListing: (id: string) => request(`/listings/${id}/review`, { method: "POST" }),
  decideFinding: (reviewId: string, findingId: string, decision: { action: "APPROVE" | "EDIT" | "REJECT"; appliedWording?: string; operatorNotes?: string }) =>
    request(`/reviews/${reviewId}/findings/${findingId}/decisions`, { method: "POST", body: JSON.stringify(decision) }),
  finalizeReview: (reviewId: string) => request(`/reviews/${reviewId}/finalize`, { method: "POST" })
};
