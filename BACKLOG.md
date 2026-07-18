# Backlog

## Portfolio audit backlog — 2026-07-17
_Findings from a 2026-07-17 code audit, preserved for later._

### Later / deferred
- **[low/M]** Server db is an in-memory Map — flagged as needing durable storage
  - Fix: The Map-based db (lib/db.ts:115-116) + its routes /api/pdfs, /api/annotations, /api/import-book, /api/pdf/[id] are dead — no live UI calls them (live persistence is localStorage). Either delete the dead server backend, or defer per README. Not a live storage bug.
- **[low/M]** No tests anywhere in the repo
  - Fix: Add a test harness (vitest). Best ROI: unit tests for lib/pdf-workflow.ts (chapter map, retry/RetryableError, resumeHook) and lib/local-library.ts round-trip. Low priority at hackathon stage.

### Known limitations (deliberate — not planned)
- pdfjs worker pulled from unpkg CDN
- All client persistence is browser localStorage — flagged as needing durable storage
- No auth on the app
- lib/sample-report.ts looks vestigial
- Durable human-in-the-loop approval gate (createHook/resumeHook) genuinely built
- demoRetryOnceStep intentionally throws RetryableError once to demo durable retries
