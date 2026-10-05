import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pino from "pino";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { batchInputSchema, listingInputSchema, normalizedListingKey, validateBatchDuplicates } from "./domain/listing.js";
import { retrievePolicies, policies } from "./domain/policy.js";
import { errorHandler } from "./middleware/errors.js";
import { reviewWithAi } from "./services/gemini-review.js";

const logger = pino();
export const app = express();

function imageUrlFromAttributes(attributes: Prisma.JsonValue | Prisma.InputJsonValue) {
  if (!attributes || Array.isArray(attributes) || typeof attributes !== "object") return undefined;
  const imageUrl = (attributes as Record<string, unknown>).__imageUrl;
  return typeof imageUrl === "string" ? imageUrl : undefined;
}

function withImageUrl<T extends { attributes: Prisma.JsonValue }>(listing: T) {
  return { ...listing, imageUrl: imageUrlFromAttributes(listing.attributes) };
}

function listingCreateData(input: z.infer<typeof listingInputSchema>) {
  const { imageUrl, ...listing } = input;
  return {
    ...listing,
    attributes: { ...listing.attributes, ...(imageUrl ? { __imageUrl: imageUrl } : {}) }
  };
}

const configuredOrigins = new Set(
  config.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
);

function isAllowedOrigin(origin: string) {
  if (configuredOrigins.has(origin)) return true;
  if (config.NODE_ENV === "development") {
    return /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin);
  }
  return false;
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
}));
app.use(express.json({ limit: "3mb" }));
app.use((req, res, next) => {
  const requestId = req.header("x-request-id") ?? randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  req.log = logger.child({ requestId, method: req.method, path: req.path });
  next();
});

app.get("/api/health", async (_req, res) => {
  await prisma.listing.count();
  res.json({ status: "ok", database: "connected", aiProvider: "gemini", aiConfigured: Boolean(config.GEMINI_API_KEY) });
});

app.get("/api/config", (_req, res) => {
  res.json({
    supportedCategories: ["ELECTRONICS", "FASHION_APPAREL", "HOME_KITCHEN", "HEALTH_WELLNESS", "COLLECTIBLES_ART", "SERVICES"],
    limits: { batchSize: 20, title: { min: 10, max: 150 }, description: { min: 30, max: 3000 }, tags: 10 }
  });
});

app.get("/api/policies", (_req, res) => res.json({ data: policies }));

app.get("/api/listings", async (_req, res) => {
  const listings = await prisma.listing.findMany({ orderBy: { createdAt: "desc" }, include: { reviews: { select: { id: true, status: true, createdAt: true } } } });
  res.json({ data: listings.map(withImageUrl) });
});

app.get("/api/listings/:id", async (req, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id }, include: { reviews: { orderBy: { createdAt: "asc" }, include: { findings: { include: { decisions: { orderBy: { decidedAt: "asc" } } } }, decisions: true } }, revisions: { orderBy: { finalizedAt: "desc" } }, auditLogs: { orderBy: { timestamp: "desc" } } } });
  if (!listing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found", requestId: res.locals.requestId } });
  res.json({ data: { ...withImageUrl(listing), revisions: listing.revisions.map(withImageUrl) } });
});

app.post("/api/listings", async (req, res) => {
  const input = listingInputSchema.parse(req.body);
  const normalizedKey = normalizedListingKey(input);
  const duplicate = await prisma.listing.findFirst({ where: { normalizedKey } });
  if (duplicate) return res.status(409).json({ error: { code: "DUPLICATE_LISTING", message: "An equivalent listing already exists", requestId: res.locals.requestId } });

  const listing = await prisma.listing.create({
    data: { ...listingCreateData(input), price: input.price, normalizedKey, auditLogs: { create: { action: "LISTING_CREATED", metadata: { source: "single" } } } }
  });
  req.log?.info({ event: "listing_created", listingId: listing.id });
  res.status(201).json({ data: listing });
});

app.post("/api/batches", async (req, res) => {
  const input = batchInputSchema.parse(req.body);
  const batchDuplicates = validateBatchDuplicates(input.listings);
  if (batchDuplicates.size > 0) return res.status(409).json({ error: { code: "DUPLICATE_BATCH_LISTINGS", message: "The batch contains duplicate listings", details: Object.fromEntries(batchDuplicates), requestId: res.locals.requestId } });

  const keys = input.listings.map(normalizedListingKey);
  const existing = await prisma.listing.findMany({ where: { normalizedKey: { in: keys } }, select: { normalizedKey: true } });
  if (existing.length > 0) return res.status(409).json({ error: { code: "DUPLICATE_LISTING", message: "One or more listings already exist", requestId: res.locals.requestId } });

  const batch = await prisma.batch.create({ data: { totalCount: input.listings.length } });
  await prisma.$transaction(input.listings.map((listing) => prisma.listing.create({ data: { ...listingCreateData(listing), price: listing.price, normalizedKey: normalizedListingKey(listing), batchId: batch.id } })));
  const createdBatch = await prisma.batch.findUnique({ where: { id: batch.id }, include: { listings: true } });
  res.status(201).json({ data: createdBatch ? { ...createdBatch, listings: createdBatch.listings.map(withImageUrl) } : createdBatch });
});

app.post("/api/listings/:id/review", async (req, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Listing not found", requestId: res.locals.requestId } });
  if (listing.status === "REVIEWING") {
    return res.status(409).json({ error: { code: "REVIEW_IN_PROGRESS", message: "A review is already in progress for this listing", requestId: res.locals.requestId } });
  }
  const input = listingInputSchema.parse({ ...listing, price: listing.price.toString(), imageUrl: imageUrlFromAttributes(listing.attributes) });
  const relevantPolicies = retrievePolicies(input);
  const review = await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listing.id }, data: { status: "REVIEWING" } });
    return tx.review.create({ data: { listingId: listing.id, status: "RUNNING", deterministicPassed: true, retrievedPolicyCodes: relevantPolicies.map((policy) => policy.code) } });
  });

  try {
    const aiResult = await reviewWithAi(input, relevantPolicies);
    const finished = await prisma.review.update({
      where: { id: review.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        aiRawResponse: aiResult,
        findings: { create: aiResult.findings.map((finding) => ({ ...finding, source: "AI" })) }
      },
      include: { findings: true }
    });
    await prisma.listing.update({ where: { id: listing.id }, data: { status: aiResult.findings.length ? "NEEDS_CHANGES" : "APPROVED" } });
    res.status(201).json({ data: finished });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI review failed";
    const publicMessage = message.includes("no longer available") || message.includes("NOT_FOUND")
      ? "The configured Gemini model is unavailable. The application now uses gemini-3.5-flash-lite; restart the backend and retry."
      : message.toLowerCase().includes("api key")
        ? "The Gemini API key is invalid or unauthorized. Create a valid key in Google AI Studio and retry."
        : "Gemini could not complete this review. Check the backend log using the request ID, then retry.";
    await prisma.review.update({ where: { id: review.id }, data: { status: "FAILED", errorMessage: publicMessage } });
    await prisma.listing.update({ where: { id: listing.id }, data: { status: "FAILED" } });
    req.log?.error({ event: "ai_review_failed", reviewId: review.id, listingId: listing.id, error: message });
    return res.status(502).json({
      error: {
        code: "AI_REVIEW_FAILED",
        message: "Gemini review failed. Verify GEMINI_API_KEY and GEMINI_MODEL, then retry the review.",
        requestId: res.locals.requestId
      }
    });
  }
});

const decisionSchema = z.object({ action: z.enum(["APPROVE", "EDIT", "REJECT"]), appliedWording: z.string().trim().min(1).optional(), operatorNotes: z.string().trim().max(500).optional() })
  .superRefine((value, ctx) => { if (value.action === "EDIT" && !value.appliedWording) ctx.addIssue({ code: "custom", message: "Edited decisions require appliedWording" }); });

app.post("/api/reviews/:reviewId/findings/:findingId/decisions", async (req, res) => {
  const input = decisionSchema.parse(req.body);
  const finding = await prisma.finding.findFirst({ where: { id: req.params.findingId, reviewId: req.params.reviewId } });
  if (!finding) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Finding not found", requestId: res.locals.requestId } });
  const decision = await prisma.decision.create({ data: { reviewId: req.params.reviewId, findingId: finding.id, ...input, appliedWording: input.action === "APPROVE" ? finding.suggestedWording : input.appliedWording } });
  res.status(201).json({ data: decision });
});

app.post("/api/reviews/:reviewId/finalize", async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.reviewId }, include: { listing: true, findings: { include: { decisions: { orderBy: { decidedAt: "desc" }, take: 1 } } } } });
  if (!review) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Review not found", requestId: res.locals.requestId } });
  if (review.status !== "COMPLETED") return res.status(409).json({ error: { code: "INVALID_REVIEW_STATE", message: "Only completed reviews can be finalized", requestId: res.locals.requestId } });
  if (review.findings.some((finding) => finding.decisions.length === 0)) return res.status(409).json({ error: { code: "UNRESOLVED_FINDINGS", message: "Every finding requires a decision before finalization", requestId: res.locals.requestId } });

  const revised = {
    title: review.listing.title,
    description: review.listing.description,
    category: review.listing.category,
    price: review.listing.price,
    attributes: (review.listing.attributes ?? {}) as Prisma.InputJsonValue,
    seller: review.listing.seller,
    tags: review.listing.tags
  };
  for (const finding of review.findings) {
    const decision = finding.decisions[0];
    if (!decision || decision.action === "REJECT" || !decision.appliedWording) continue;
    if (finding.field === "title") revised.title = decision.appliedWording;
    if (finding.field === "description") revised.description = decision.appliedWording;
    if (finding.field === "seller") revised.seller = decision.appliedWording;
    if (finding.field === "category") revised.category = decision.appliedWording;
  }

  const result = await prisma.$transaction(async (tx) => {
    const snapshot = await tx.revisedListing.create({ data: { listingId: review.listingId, ...revised } });
    await tx.review.update({ where: { id: review.id }, data: { status: "FINALIZED" } });
    await tx.listing.update({ where: { id: review.listingId }, data: { status: "APPROVED" } });
    await tx.auditLog.create({ data: { listingId: review.listingId, action: "REVIEW_FINALIZED", metadata: { reviewId: review.id, revisionId: snapshot.id } } });
    return snapshot;
  });
  res.status(201).json({ data: result });
});

app.use(errorHandler);
