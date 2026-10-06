import { describe, expect, it } from "vitest";
import { listingInputSchema, normalizedListingKey } from "./listing.js";
import { sampleListings } from "./sample-listings.js";

describe("sample catalog", () => {
  it("contains valid, image-backed, non-duplicate listings", () => {
    expect(sampleListings.length).toBeGreaterThanOrEqual(10);
    const parsed = sampleListings.map((listing) => listingInputSchema.parse(listing));
    expect(parsed.every((listing) => listing.imageUrl?.startsWith("https://"))).toBe(true);
    expect(new Set(parsed.map(normalizedListingKey)).size).toBe(parsed.length);
  });
});
