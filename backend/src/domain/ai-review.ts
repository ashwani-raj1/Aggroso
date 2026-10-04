import { z } from "zod";

export const aiFindingSchema = z.object({
  field: z.enum(["title", "description", "category", "price", "attributes", "seller", "tags"]),
  issueType: z.enum(["UNCLEAR", "MISLEADING", "PROHIBITED", "INCOMPLETE", "UNVERIFIABLE", "STYLE_VIOLATION"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  explanation: z.string().min(1),
  supportingEvidence: z.string().nullable(),
  policyCode: z.string().min(1),
  suggestedWording: z.string().nullable()
});

export const aiReviewSchema = z.object({
  summary: z.string().min(1),
  overallCompliance: z.enum(["COMPLIANT", "NEEDS_CHANGES", "PROHIBITED"]),
  findings: z.array(aiFindingSchema)
});

export type AiReview = z.infer<typeof aiReviewSchema>;

export function validateCitations(review: AiReview, retrievedPolicyCodes: string[]) {
  const allowed = new Set(retrievedPolicyCodes);
  const invalid = review.findings.filter((finding) => !allowed.has(finding.policyCode));
  if (invalid.length > 0) {
    throw new Error(`AI returned citations outside the retrieved policy set: ${invalid.map((item) => item.policyCode).join(", ")}`);
  }
  return review;
}
