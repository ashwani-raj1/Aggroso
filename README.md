# Marketplace Listing Quality Reviewer

A human-in-the-loop application that validates marketplace listings, retrieves relevant policy guidance, generates cited AI findings, and lets reviewers approve, edit, or reject suggested revisions.

## Stack

- React, Vite, and TypeScript
- Express and TypeScript
- PostgreSQL and Prisma
- Zod validation
- Gemini 3.5 Flash Lite structured JSON output
- Vitest, React Testing Library, and Supertest

## Local setup

1. Copy `.env.example` to `backend/.env` and provide a Supabase PostgreSQL transaction-pooler connection string and Gemini API key.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate -w backend`.
4. Open `backend/prisma/init.sql` in Supabase SQL Editor and run it once to create the schema.
5. Seed policies with `npm run db:seed -w backend`.
6. Start both applications with `npm run dev`.

The frontend runs at `http://localhost:5173` and the API at `http://localhost:4000`.

The seed command is idempotent and also adds six reviewer-friendly sample listings covering compliant content, medical claims, authenticity claims, incomplete services, refurbished electronics, and home goods.

### Supabase note

The transaction pooler uses port `6543`. The backend uses Prisma's PostgreSQL driver adapter with a one-connection `pg` pool to avoid prepared-statement collisions. Prisma schema-management commands can still fail through transaction pooling, so the initial schema is supplied as `backend/prisma/init.sql` for the Supabase SQL Editor.

## Core workflow

Listings first pass deterministic checks for required fields, supported categories, price format, length limits, and duplicates. Valid listings are matched to relevant policy sections and reviewed by the AI. Every AI finding must cite a retrieved policy section. Suggestions are proposals only and require explicit reviewer approval, editing, or rejection.

## Current scope

- Single listing creation
- Excel (`.xlsx`/`.xls`) batches of up to 20 listings
- Optional listing image URL and image previews
- Indian rupee price formatting
- Live Pending, Evaluating, Needs Changes, Approved, and Failed status views
- Deterministic validation
- Policy retrieval and cited AI review
- Field-level decisions and revised snapshots
- Review and approval history

## Excluded scope

Publishing, payments, image moderation, seller verification, unrestricted categories, and large-scale batch infrastructure are intentionally excluded.

## Tests

Run all tests with:

```bash
npm test
```

## Deployment

The frontend is designed for Vercel, the Express API for Render or Railway, and PostgreSQL for Neon or Supabase. Deployment URLs and final verification details will be added before submission.
