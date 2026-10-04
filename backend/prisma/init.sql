-- Initial Supabase/PostgreSQL schema for the Marketplace Listing Quality Reviewer.
-- This file is intended for Supabase SQL Editor when Prisma schema commands cannot
-- run through the transaction pooler. It is safe to run against an empty project.

DO $$ BEGIN CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'VALIDATION_FAILED', 'REVIEWING', 'NEEDS_CHANGES', 'APPROVED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'FINALIZED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FindingSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FindingSource" AS ENUM ('DETERMINISTIC', 'AI'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DecisionAction" AS ENUM ('APPROVE', 'EDIT', 'REJECT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Batch" (
  "id" TEXT PRIMARY KEY,
  "totalCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Listing" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "attributes" JSONB NOT NULL,
  "seller" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL,
  "imageUrl" TEXT,
  "normalizedKey" TEXT NOT NULL,
  "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Listing_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT PRIMARY KEY,
  "listingId" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "deterministicPassed" BOOLEAN NOT NULL,
  "deterministicErrors" JSONB,
  "retrievedPolicyCodes" TEXT[] NOT NULL,
  "aiRawResponse" JSONB,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Finding" (
  "id" TEXT PRIMARY KEY,
  "reviewId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "issueType" TEXT NOT NULL,
  "severity" "FindingSeverity" NOT NULL,
  "explanation" TEXT NOT NULL,
  "supportingEvidence" TEXT,
  "policyCode" TEXT NOT NULL,
  "suggestedWording" TEXT,
  "source" "FindingSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Finding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Decision" (
  "id" TEXT PRIMARY KEY,
  "reviewId" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "action" "DecisionAction" NOT NULL,
  "appliedWording" TEXT,
  "operatorNotes" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Decision_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Decision_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RevisedListing" (
  "id" TEXT PRIMARY KEY,
  "listingId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "attributes" JSONB NOT NULL,
  "seller" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL,
  "imageUrl" TEXT,
  "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevisedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PolicySection" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "keywords" TEXT[] NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "listingId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Listing_normalizedKey_idx" ON "Listing"("normalizedKey");
CREATE INDEX IF NOT EXISTS "Listing_status_idx" ON "Listing"("status");
CREATE INDEX IF NOT EXISTS "Review_listingId_idx" ON "Review"("listingId");
CREATE INDEX IF NOT EXISTS "Decision_findingId_idx" ON "Decision"("findingId");
CREATE INDEX IF NOT EXISTS "RevisedListing_listingId_idx" ON "RevisedListing"("listingId");
CREATE INDEX IF NOT EXISTS "AuditLog_listingId_idx" ON "AuditLog"("listingId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
