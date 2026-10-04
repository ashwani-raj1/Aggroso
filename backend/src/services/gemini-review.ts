import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import { aiReviewSchema, validateCitations } from "../domain/ai-review.js";
import type { ListingInput } from "../domain/listing.js";
import type { Policy } from "../domain/policy.js";

const client = config.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: config.GEMINI_API_KEY }) : null;

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "overallCompliance", "findings"],
  properties: {
    summary: { type: "string" },
    overallCompliance: { type: "string", enum: ["COMPLIANT", "NEEDS_CHANGES", "PROHIBITED"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "issueType", "severity", "explanation", "supportingEvidence", "policyCode", "suggestedWording"],
        properties: {
          field: { type: "string", enum: ["title", "description", "category", "price", "attributes", "seller", "tags"] },
          issueType: { type: "string", enum: ["UNCLEAR", "MISLEADING", "PROHIBITED", "INCOMPLETE", "UNVERIFIABLE", "STYLE_VIOLATION"] },
          severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          explanation: { type: "string" },
          supportingEvidence: { anyOf: [{ type: "string" }, { type: "null" }] },
          policyCode: { type: "string" },
          suggestedWording: { anyOf: [{ type: "string" }, { type: "null" }] }
        }
      }
    }
  }
} as const;

export async function reviewWithAi(listing: ListingInput, relevantPolicies: Policy[]) {
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const prompt = [
    "Act as a marketplace policy auditor.",
    "Use only the supplied policy sections and cite their exact code.",
    "Do not invent missing product facts or directly modify the listing.",
    "Identify unclear, misleading, prohibited, incomplete, unverifiable, and style-related content.",
    "Return one focused finding per issue and suggest wording only when it can be improved without inventing facts.",
    JSON.stringify({ listing, policies: relevantPolicies })
  ].join("\n\n");

  const response = await client.models.generateContent({
    model: config.GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema
    }
  });

  if (!response.text) throw new Error("Gemini returned an empty response");
  const parsed = aiReviewSchema.parse(JSON.parse(response.text));
  return validateCitations(parsed, relevantPolicies.map((policy) => policy.code));
}
