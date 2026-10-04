import { describe, expect, it } from "vitest";
import { listingInputSchema, normalizedListingKey, validateBatchDuplicates, type ListingInput } from "./listing.js";

const valid: ListingInput = {
  title: "Wireless studio headphones",
  description: "Over-ear wireless headphones in good working condition.",
  category: "ELECTRONICS",
  price: "99.99",
  attributes: { condition: "Used" },
  seller: "North Audio",
  tags: ["wireless"]
};

describe("listing validation", () => {
  it("accepts a valid listing", () => expect(listingInputSchema.safeParse(valid).success).toBe(true));
  it.each(["-1", "free", "12.999", "₹20", "0"])("rejects invalid price %s", (price) => expect(listingInputSchema.safeParse({ ...valid, price }).success).toBe(false));
  it("rejects unsupported categories", () => expect(listingInputSchema.safeParse({ ...valid, category: "OTHER" }).success).toBe(false));
  it("normalizes duplicate identity", () => expect(normalizedListingKey(valid)).toBe(normalizedListingKey({ ...valid, title: "  WIRELESS   studio headphones!!!", seller: "north audio" })));
  it("detects duplicates within a batch", () => expect(validateBatchDuplicates([valid, { ...valid }]).get(1)?.[0]?.code).toBe("DUPLICATE_LISTING"));
});
