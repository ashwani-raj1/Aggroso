import type { ListingInput } from "./listing.js";

export type Policy = {
  code: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
};

export const policies: Policy[] = [
  {
    code: "POL-REQUIRED-01",
    category: "ALL",
    title: "Complete and accurate information",
    content: "Listings must contain clear, complete, and factually supportable information about the item or service.",
    keywords: ["details", "condition", "size", "model", "service"]
  },
  {
    code: "POL-CLAIMS-01",
    category: "ALL",
    title: "Unverifiable and absolute claims",
    content: "Absolute, comparative, or guaranteed claims require reliable supporting evidence and must not mislead buyers.",
    keywords: ["best", "guaranteed", "100%", "authentic", "original", "number one", "fastest"]
  },
  {
    code: "POL-HEALTH-01",
    category: "HEALTH_WELLNESS",
    title: "Medical and health claims",
    content: "Listings must not claim to diagnose, treat, cure, or prevent a condition without appropriate authorization and evidence.",
    keywords: ["cure", "treat", "diagnose", "pain", "disease", "medical", "therapy"]
  },
  {
    code: "POL-PROHIBITED-01",
    category: "ALL",
    title: "Prohibited goods and services",
    content: "Illegal, dangerous, controlled, or otherwise prohibited goods and services may not be listed.",
    keywords: ["weapon", "illegal", "controlled", "prescription", "counterfeit"]
  },
  {
    code: "STYLE-CLEAR-01",
    category: "ALL",
    title: "Clear marketplace writing",
    content: "Titles and descriptions should be concise, readable, specific, and free of excessive capitalization or promotional clutter.",
    keywords: ["buy now", "limited", "wow", "sale", "urgent"]
  }
];

function listingText(listing: ListingInput) {
  return [listing.title, listing.description, listing.category, listing.seller, ...listing.tags, ...Object.values(listing.attributes)]
    .join(" ")
    .toLowerCase();
}

export function retrievePolicies(listing: ListingInput, limit = 5): Policy[] {
  const text = listingText(listing);
  return policies
    .map((policy) => ({
      policy,
      score: (policy.category === listing.category ? 3 : policy.category === "ALL" ? 1 : 0)
        + policy.keywords.reduce((score, keyword) => score + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0)
    }))
    .filter(({ policy, score }) => score > 0 && (policy.category === "ALL" || policy.category === listing.category))
    .sort((a, b) => b.score - a.score || a.policy.code.localeCompare(b.policy.code))
    .slice(0, limit)
    .map(({ policy }) => policy);
}
