export type ListingStatus = "PENDING" | "VALIDATION_FAILED" | "REVIEWING" | "NEEDS_CHANGES" | "APPROVED" | "FAILED";

export type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  attributes: Record<string, string>;
  seller: string;
  tags: string[];
  status: ListingStatus;
  createdAt: string;
  reviews?: Array<{ id: string; status: string; createdAt: string }>;
};

export type ListingInput = Omit<Listing, "id" | "status" | "createdAt" | "reviews">;

export type Decision = {
  id: string;
  action: "APPROVE" | "EDIT" | "REJECT";
  appliedWording?: string | null;
  operatorNotes?: string | null;
  decidedAt: string;
};

export type Finding = {
  id: string;
  field: string;
  issueType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  explanation: string;
  supportingEvidence?: string | null;
  policyCode: string;
  suggestedWording?: string | null;
  decisions: Decision[];
};

export type Review = {
  id: string;
  status: string;
  createdAt: string;
  errorMessage?: string | null;
  retrievedPolicyCodes: string[];
  findings: Finding[];
};

export type ListingDetail = Omit<Listing, "reviews"> & {
  reviews: Review[];
  revisions: unknown[];
  auditLogs: unknown[];
};
