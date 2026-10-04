import { describe, expect, it } from "vitest";
import { aiReviewSchema, validateCitations } from "./ai-review.js";

const response = aiReviewSchema.parse({
  summary: "One unsupported claim found.",
  overallCompliance: "NEEDS_CHANGES",
  findings: [{ field: "title", issueType: "UNVERIFIABLE", severity: "HIGH", explanation: "The guarantee is not supported.", supportingEvidence: "100% guaranteed", policyCode: "POL-CLAIMS-01", suggestedWording: "Comfortable support cushion" }]
});

describe("AI response guardrails", () => {
  it("accepts retrieved citations", () => expect(validateCitations(response, ["POL-CLAIMS-01"])).toEqual(response));
  it("rejects invented citations", () => expect(() => validateCitations(response, ["STYLE-CLEAR-01"])).toThrow(/outside the retrieved policy set/));
});
