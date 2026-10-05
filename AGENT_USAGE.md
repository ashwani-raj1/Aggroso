# Agent Usage

This file records how AI-assisted development was used and how its output was reviewed. AI-generated code and suggestions were treated as drafts; the repository owner remains responsible for the submitted work.

## Tools and models used

| Tool | Use in this project | Human control |
| --- | --- | --- |
| Codex | Architecture planning, implementation, debugging, tests, documentation, and walkthrough assets | Changes were inspected, built, tested, and committed in small increments |
| Google Gemini | Runtime listing-quality review against retrieved marketplace policies | Findings are proposals only; a reviewer must approve, edit, or reject each one |
| Prisma | Typed PostgreSQL access and schema generation | Schema creation and seed commands are explicit operator actions |
| Vitest | Focused domain and AI-output guardrail tests | Test results were checked before repository updates |

No separate coding sub-agents or delegated human contributors were used. The runtime Gemini call is part of the product workflow, not delegated development work.

## Representative development prompts

- Design a bounded, human-in-the-loop marketplace listing review workflow using React, Express, Prisma, and PostgreSQL.
- Separate deterministic validation from AI review so invalid data does not consume an LLM request.
- Retrieve only relevant policy sections and reject every Gemini citation that was not included in the prompt context.
- Preserve the original listing, AI response, reviewer decisions, revised snapshot, retries, and audit history.
- Add manual and Excel batch ingestion, Indian-rupee formatting, image preview, clear workflow states, and sample listings.
- Diagnose Supabase transaction-pooler prepared-statement failures without disabling transport security.
- Create focused tests for input boundaries, duplicate detection, policy ranking, structured AI parsing, and citation verification.
- Document the architecture, ER model, end-to-end workflow, setup, deployment, limitations, and reviewer demo path.

## Important mistakes, rejected suggestions, and corrections

| Problem encountered | Rejected or incorrect approach | Final correction |
| --- | --- | --- |
| Supabase pooler returned `prepared statement already exists` | Repeatedly retrying Prisma's default connection behavior | Used Prisma's PostgreSQL driver adapter with a bounded `pg` pool and documented transaction-pooler constraints |
| Database schema was missing | Assuming `prisma generate` creates database tables | Added an explicit Supabase bootstrap SQL file and separate generation, schema, and seed steps |
| TLS certificate startup failures | Disabling TLS verification | Made the CA path optional, validated real file paths, ignored certificates in Git, and retained encrypted connections |
| Gemini model returned `404` | Continuing to use a retired model identifier | Updated the default model and kept a compatibility upgrade for the obsolete local value |
| AI could return invented policy references | Trusting model citations as plain text | Added structured-output validation and an allowlist check against the exact retrieved policy codes |
| Suggestions could overwrite source content | Applying Gemini rewrites immediately | Preserved original listings and required explicit approve, edit, or reject decisions before finalization |
| Frontend import/build errors | Leaving packages or Vite environment types implicit | Added workspace dependencies and explicit Vite environment typing, then verified the production build |
| README Mermaid diagrams failed on GitHub | Keeping syntax accepted only by other Mermaid renderers | Simplified sequence labels and rechecked GitHub-compatible Mermaid source |

## Runtime AI safety and review boundary

Gemini receives a bounded listing plus selected policy sections. Its response must match the backend schema. Each finding must identify a field, severity, evidence, explanation, suggestion, and one of the supplied policy codes. Unknown citations and malformed responses are rejected. Gemini never writes a revised listing directly; only a human-reviewed finalization endpoint can create the immutable revision.

## Verification performed

- `npm run lint` for TypeScript validation in both workspaces.
- `npm test` for deterministic validation, duplicate keys, batch duplicates, policy scoring, AI response parsing, and citation enforcement.
- `npm run build` for production frontend and backend builds.
- Full decoding of the README GIF and narrated MP4 walkthrough.
- Manual checks of listing creation, dashboard states, Excel import, Gemini review, approve/edit/reject actions, finalization, and persisted history.
- Secret review of tracked configuration: only variable names and placeholders belong in `.env.example`; API keys, passwords, tokens, and certificates are excluded.

## Known limitations

There are no frontend component tests yet; frontend behavior was verified through the production build and manual walkthrough. The policy retriever uses deterministic category and keyword scoring rather than embeddings. Image data is suitable only for this bounded demonstration. Deployment credentials and provider-generated URLs are intentionally not committed.
