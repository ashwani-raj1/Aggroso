import { createHash } from "node:crypto";
import { z } from "zod";

export const supportedCategories = [
  "ELECTRONICS",
  "FASHION_APPAREL",
  "HOME_KITCHEN",
  "HEALTH_WELLNESS",
  "COLLECTIBLES_ART",
  "SERVICES"
] as const;

const pricePattern = /^\d+(?:\.\d{1,2})?$/;
const supportedImage = /^(https?:\/\/|data:image\/(?:jpeg|png|webp);base64,)/i;

export const listingInputSchema = z.object({
  title: z.string().trim().min(10).max(150),
  description: z.string().trim().min(30).max(3000),
  category: z.enum(supportedCategories),
  price: z.string().trim().regex(pricePattern, "Price must be a positive number with at most two decimal places").refine((value) => {
    const amount = Number(value);
    return amount >= 0.01 && amount <= 999999.99;
  }, "Price must be between 0.01 and 999999.99"),
  attributes: z.record(z.string().trim()).default({}),
  seller: z.string().trim().min(1).max(120),
  tags: z.array(z.string().trim().min(2).max(30)).max(10).default([]),
  imageUrl: z.string().trim().max(2_000_000, "Image is too large").refine((value) => supportedImage.test(value), "Use an HTTP image URL or a JPG, PNG, or WebP upload").optional()
});

export const batchInputSchema = z.object({
  listings: z.array(listingInputSchema).min(1).max(20)
});

export type ListingInput = z.infer<typeof listingInputSchema>;

export function normalizedListingKey(listing: Pick<ListingInput, "title" | "seller" | "category">) {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  const composite = `${normalize(listing.seller)}::${listing.category}::${normalize(listing.title)}`;
  return createHash("sha256").update(composite).digest("hex");
}

export type ValidationFinding = {
  field: string;
  code: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  policyCode: string;
};

export function validateBatchDuplicates(listings: ListingInput[]): Map<number, ValidationFinding[]> {
  const findings = new Map<number, ValidationFinding[]>();
  const firstIndexByKey = new Map<string, number>();

  listings.forEach((listing, index) => {
    const key = normalizedListingKey(listing);
    const firstIndex = firstIndexByKey.get(key);
    if (firstIndex === undefined) {
      firstIndexByKey.set(key, index);
      return;
    }

    findings.set(index, [{
      field: "title",
      code: "DUPLICATE_LISTING",
      severity: "HIGH",
      message: `Duplicate of listing ${firstIndex + 1} in this batch.`,
      policyCode: "SYS-DUPLICATE"
    }]);
  });

  return findings;
}
