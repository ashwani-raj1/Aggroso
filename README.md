<p align="center">
  <img src="docs/assets/readme-hero.svg" alt="Marketplace Listing Quality Reviewer" width="100%" />
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/Express-5-1f2937?logo=express&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-3ecf8e?logo=supabase&logoColor=white" />
  <img alt="Gemini" src="https://img.shields.io/badge/AI-Gemini-8e75ff?logo=googlegemini&logoColor=white" />
  <img alt="Human reviewed" src="https://img.shields.io/badge/AI_actions-Human_reviewed-167a55" />
</p>

# Marketplace Listing Quality Reviewer

A human-in-the-loop application that validates marketplace listings, retrieves relevant policy guidance, generates cited AI findings, and lets reviewers approve, edit, or reject suggested revisions.

> **Submission scope:** one bounded marketplace policy set, six supported categories, manual entry, and Excel batches of up to 20 records. AI output is advisory and never changes a listing without human approval.

## Documentation map

- [Product screenshots](#product-screenshots)
- [Architecture](#architecture)
- [End-to-end workflows](#end-to-end-workflows)
- [Deterministic rules](#deterministic-rules)
- [AI workflow and guardrails](#ai-workflow-and-guardrails)
- [Data model](#data-model)
- [Local setup](#local-setup)
- [Excel import format](#excel-import-format)
- [API guide](#api-guide)
- [Tests](#tests)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## At a glance

| Input | Automated checks | AI output | Human control | Evidence |
| --- | --- | --- | --- | --- |
| Manual form or Excel | Required fields, price, category, lengths, duplicates | Cited, severity-ranked findings and proposed wording | Approve, edit, reject, finalize | Original, attempts, decisions, revisions, audit log |

## Product screenshots

### 1. Operations dashboard

![Dashboard showing seeded listings and review statuses](docs/screenshots/dashboard.png)

The dashboard summarizes the complete queue and provides filters for `PENDING`, `REVIEWING` (shown as **Evaluating**), `NEEDS_CHANGES`, `APPROVED`, and `FAILED`.

### 2. Manual listing intake

![Manual listing form with INR price and image upload](docs/screenshots/create-listing.png)

Manual entry supports the required marketplace fields, INR pricing, tags, an image URL, or an image selected from the reviewer’s computer.

### 3. Excel batch intake

![Excel batch import workspace](docs/screenshots/excel-import.png)

The batch workspace provides a downloadable template, validates the first worksheet, previews parsed rows, and limits each batch to 20 listings.

### 4. Human review workbench

![Review workbench showing a cited policy finding](docs/screenshots/review-workbench.png)

The workbench shows the immutable source listing, review history, severity, evidence, exact policy code, suggested wording when available, and reviewer decision controls.

### Product journey

![Five-stage listing review journey](docs/assets/review-workflow.svg)

## Stack

- React, Vite, and TypeScript
- Express and TypeScript
- PostgreSQL and Prisma
- Zod validation
- Gemini 3.5 Flash Lite structured JSON output
- Vitest and Supertest

| Frontend | Backend | Data and AI | Quality |
| --- | --- | --- | --- |
| React, Vite, TanStack Query, React Router | Express, Zod, Pino | Prisma, PostgreSQL, Gemini | TypeScript, Vitest, Supertest |

## Architecture

```mermaid
flowchart LR
    U[Reviewer] --> F[React + Vite]
    F -->|REST JSON| E[Express API]
    E --> Z[Zod validation]
    Z --> D[Deterministic checks]
    D --> P[Policy retrieval]
    P --> G[Gemini structured review]
    G --> C[Citation guardrails]
    C -->|Persist review + findings| DB[(Supabase PostgreSQL)]
    F -->|Approve / edit / reject| E
    E --> R[Decision + revision workflow]
    R -->|Append decisions + snapshot| DB
```

The backend follows a small layered design: routes coordinate the workflow, domain modules contain pure validation and policy logic, the Gemini service owns provider communication, Prisma persists workflow state, and middleware normalizes errors. Every request receives an `x-request-id` that also appears in structured Pino logs.

## End-to-end workflows

### Listing review

```mermaid
sequenceDiagram
    actor Reviewer
    participant UI as React UI
    participant API as Express API
    participant DB as PostgreSQL
    participant AI as Gemini
    Reviewer->>UI: Enter listing
    UI->>API: POST /api/listings
    API->>API: Zod validation + normalized duplicate key
    API->>DB: Insert original + LISTING_CREATED audit event
    API-->>UI: Listing status PENDING
    UI->>API: POST /api/listings/:id/review
    API->>DB: Listing=REVIEWING; Review=RUNNING
    API->>API: Retrieve relevant policies
    API->>AI: Listing + permitted policy sections
    AI-->>API: Structured findings
    API->>API: Validate JSON and citations
    alt Findings returned
        API->>DB: Review=COMPLETED; Listing=NEEDS_CHANGES
    else No findings
        API->>DB: Review=COMPLETED; Listing=APPROVED
    else Provider or parsing failure
        API->>DB: Review=FAILED; Listing=FAILED
    end
    API-->>UI: Persisted review result
```

### Human approval lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> REVIEWING: review requested
    REVIEWING --> APPROVED: no findings
    REVIEWING --> NEEDS_CHANGES: findings detected
    REVIEWING --> FAILED: provider or parsing error
    FAILED --> REVIEWING: retry
    NEEDS_CHANGES --> NEEDS_CHANGES: approve / edit / reject findings
    NEEDS_CHANGES --> APPROVED: finalize revision
    APPROVED --> [*]
```

Finalization creates an immutable `RevisedListing`; it never overwrites the original. Review attempts, raw AI output, findings, decisions, failures, revisions, and audit events remain available for traceability.

### Batch processing

```mermaid
sequenceDiagram
    actor Reviewer
    participant UI as Excel workspace
    participant API as Express API
    participant DB as PostgreSQL
    participant AI as Gemini
    Reviewer->>UI: Select XLSX / XLS file
    UI->>UI: Parse first sheet and preview 1–20 rows
    UI->>API: POST /api/batches
    API->>API: Validate records + within-batch duplicates
    API->>DB: Check persisted duplicate keys
    API->>DB: Create Batch + Listings transaction
    API-->>UI: Created batch and listings
    UI->>UI: Return immediately to dashboard
    loop Each listing, sequentially
        UI->>API: POST /api/listings/:id/review
        API->>AI: Grounded review
        API->>DB: Persist independent result or failure
        UI->>API: Refresh dashboard listings
    end
```

One failed AI review does not stop subsequent batch listings. The dashboard polls only while at least one listing is actively `REVIEWING`; ordinary `PENDING` listings do not create continuous database traffic.

### Finding decisions and finalization

```mermaid
flowchart LR
    F[Finding] --> A[Approve suggestion]
    F --> E[Edit then approve]
    F --> R[Reject finding]
    A --> D[(Decision history)]
    E --> D
    R --> D
    D --> Q{Every finding has a decision?}
    Q -->|No| W[Keep finalization disabled]
    Q -->|Yes| S[Create RevisedListing snapshot]
    S --> L[Set Review FINALIZED]
    L --> P[Set Listing APPROVED]
    P --> H[Append REVIEW_FINALIZED audit event]
```

## Deterministic rules

| Field | Constraint |
| --- | --- |
| Title | Required; 10–150 characters |
| Description | Required; 30–3,000 characters |
| Category | One of six supported categories |
| Price | ₹0.01–₹999,999.99; maximum two decimals |
| Seller | Required; maximum 120 characters |
| Tags | Maximum 10; each 2–30 characters |
| Image | Optional HTTP(S) URL or uploaded JPG/PNG/WebP |
| Batch | 1–20 listings |
| Duplicate | SHA-256 of normalized seller, category, and title |

Categories: `ELECTRONICS`, `FASHION_APPAREL`, `HOME_KITCHEN`, `HEALTH_WELLNESS`, `COLLECTIBLES_ART`, and `SERVICES`.

## AI workflow and guardrails

The retriever scores universal and category-specific policy sections using category relevance and keyword matches. Only the top relevant sections are sent to Gemini. Gemini runs at temperature `0` and must return a fixed JSON schema containing the affected field, issue type, severity, explanation, supporting evidence, policy code, and optional suggested wording.

Three controls are applied before findings reach the reviewer:

1. Zod rejects malformed responses and unknown enum values.
2. Citation validation rejects policy codes that were not included in that review's retrieved context.
3. Human approval prevents AI text from being applied automatically.

The prompt explicitly prohibits invented specifications. Missing information may be flagged as incomplete, but suggested copy cannot manufacture product facts.

## Data model

```mermaid
erDiagram
    Batch o|--o{ Listing : groups
    Listing ||--o{ Review : has
    Listing ||--o{ RevisedListing : snapshots
    Listing o|--o{ AuditLog : records
    Review ||--o{ Finding : returns
    Review ||--o{ Decision : receives
    Finding ||--o{ Decision : resolved_by
    Batch {
      string id PK
      int totalCount
      datetime createdAt
    }
    Listing {
      string id PK
      string title
      string category
      decimal price
      json attributes
      string normalizedKey
      ListingStatus status
    }
    Review {
      string id PK
      ReviewStatus status
      string_array retrievedPolicyCodes
      json aiRawResponse
      int retryCount
    }
    Finding {
      string id PK
      string field
      FindingSeverity severity
      string policyCode
      string suggestedWording
    }
    Decision {
      string id PK
      DecisionAction action
      string appliedWording
      string operatorNotes
    }
    RevisedListing {
      string id PK
      datetime finalizedAt
    }
    AuditLog {
      string id PK
      string action
      json metadata
      datetime timestamp
    }
    PolicySection {
      string id PK
      string code UK
      string category
      string title
      string content
      string_array keywords
      boolean isActive
    }
```

`PolicySection` is intentionally not connected by a database foreign key: findings preserve the cited `policyCode`, while each review also stores the exact `retrievedPolicyCodes` supplied to Gemini. The backend verifies that every returned citation belongs to that retrieved set before saving it.

Images are compressed in the browser and stored in `attributes.__imageUrl` for this bounded demonstration. Production should use object storage and retain only an asset URL in PostgreSQL.

## Repository structure

```text
frontend/src/pages/       Dashboard, creation, Excel import, review workbench
frontend/src/api.ts       API wrapper
frontend/src/styles.css   Responsive visual system
backend/src/domain/       Validation, duplicate, policy, and AI schemas
backend/src/services/     Gemini integration
backend/src/app.ts        REST routes and workflow orchestration
backend/prisma/           Schema, Supabase bootstrap SQL, and seed
samples/listings.json     Import-ready sample data
```

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

The transaction pooler uses port `6543`. The backend uses Prisma's PostgreSQL driver adapter with a bounded five-connection `pg` pool, verified TLS, connection keep-alive, and joined relation loading for detail pages. Prisma schema-management commands can still fail through transaction pooling, so the initial schema is supplied as `backend/prisma/init.sql` for the Supabase SQL Editor.

For verified TLS, download the server root certificate from **Supabase → Project Settings → Database → SSL Configuration**, save it as `backend/certs/prod-supabase.crt`, and configure:

```env
DATABASE_CA_CERT_PATH=./certs/prod-supabase.crt
```

The certificate and `backend/.env` are ignored by Git. Never solve certificate errors by disabling TLS verification.

## Core workflow

Listings first pass deterministic checks for required fields, supported categories, price format, length limits, and duplicates. Valid listings are matched to relevant policy sections and reviewed by the AI. Every AI finding must cite a retrieved policy section. Suggestions are proposals only and require explicit reviewer approval, editing, or rejection.

## Excel import format

The first worksheet uses these columns:

| Column | Required | Example |
| --- | --- | --- |
| `title` | Yes | `Wireless noise-cancelling headphones` |
| `description` | Yes | `Over-ear headphones with...` |
| `category` | Yes | `ELECTRONICS` |
| `price` | Yes | `12999.00` |
| `seller` | Yes | `Acme Audio` |
| `tags` | No | `wireless, audio, travel` |
| `imageUrl` | No | `https://example.com/item.webp` |
| `attributes` | No | JSON object or supported key/value text |

## API guide

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Database and AI readiness |
| `GET` | `/api/config` | Supported categories and limits |
| `GET` | `/api/policies` | Bounded policy catalogue |
| `GET` | `/api/listings` | Dashboard collection |
| `POST` | `/api/listings` | Validate and create one listing |
| `GET` | `/api/listings/:id` | Listing, reviews, revisions, and history |
| `POST` | `/api/batches` | Create an Excel-derived batch |
| `POST` | `/api/listings/:id/review` | Run policy retrieval and Gemini review |
| `POST` | `/api/reviews/:reviewId/findings/:findingId/decisions` | Approve, edit, or reject a finding |
| `POST` | `/api/reviews/:reviewId/finalize` | Create an immutable revised snapshot |

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

Run the full quality gate before deployment:

```bash
npm run lint
npm test
npm run build
```

Tests focus on validation boundaries, duplicate keys, batch duplicates, policy scoring, AI response parsing, and citation verification. With the app running, `GET http://localhost:4000/api/health` should return `database: connected` and `aiConfigured: true`.

## Deployment

The frontend is designed for Vercel, the Express API for Render or Railway, and PostgreSQL for Neon or Supabase. Deployment URLs and final verification details will be added before submission.

### Frontend

Deploy `frontend`, build with `npm run build`, publish `dist`, and set `VITE_API_BASE_URL` to the hosted API URL ending in `/api`.

### Backend

Build with `npm install && npm run build -w backend` and start with `npm run start -w backend`. Configure `DATABASE_URL`, `DATABASE_CA_CERT_PATH`, `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CLIENT_ORIGIN`. Store the Supabase certificate as a secret file, not in Git.

Before submission, verify health, manual creation, Excel import, one successful AI review, all three decision actions, finalization, retry behavior, and page refresh persistence.

## Troubleshooting

- **Dashboard cannot load listings:** call `/api/health`, match its request ID to the backend log, and verify the Supabase URL and certificate path.
- **`prepared statement already exists`:** use the included PostgreSQL adapter and restart stale backend processes; transaction pooling does not support prepared statements.
- **Gemini review failed:** verify the API key/model, restart the backend, and retry. Failed attempts remain in history.
- **Excel import failed:** use `.xlsx`/`.xls`, verify the documented headers, and keep the batch at 20 rows or fewer.

## Security and limitations

- Secrets, database passwords, and certificates must never be committed.
- The frontend never receives the Gemini key or database password.
- Images are displayed but not moderated.
- Retrieval is deterministic category/keyword scoring rather than a vector database.
- Authentication, marketplace publishing, payments, and seller verification are outside scope.
- Batch processing is bounded and sequential rather than distributed.
