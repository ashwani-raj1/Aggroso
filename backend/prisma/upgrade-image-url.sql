-- Run once in Supabase SQL Editor for databases created before image support.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "RevisedListing" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
