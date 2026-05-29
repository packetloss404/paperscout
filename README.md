# PaperScout

PaperScout turns dense reports and research papers into research intelligence: analyst briefs, claim cards, caveats, citation leads, skeptical checks, unusual findings, and follow-up research trails.

The product thesis is simple: uploading a paper should not stop at summarization. PaperScout helps a reader turn a document into a verification queue they can inspect, edit, export, and continue researching.

## Current Focus

PaperScout currently focuses on a local, browser-friendly research workflow:

- Upload a PDF in the browser.
- Extract text client-side with `pdfjs-dist`.
- Start a durable Workflow SDK run from `/api/upload-pdf`.
- Pause for human chapter-map approval before expensive fan-out processing.
- Generate a structured research brief with claims, caveats, citations, skeptic checks, and trails.
- Save completed reports and Scout Board follow-ups in browser `localStorage`.
- Export and re-import PaperScout JSON reports.

This is intentionally not yet a production storage or account system. Large document text and completed reports are still passed through request/browser-local flows while the app thesis is being shaped.

## Tech Stack

- Next.js 16 and React 19
- Workflow SDK for durable PDF-processing orchestration
- AI SDK with OpenAI for analysis and report generation
- `pdfjs-dist` for client-side PDF text extraction
- React Markdown, KaTeX, and Tailwind CSS for rendering
- Browser `localStorage` for the current hackathon-friendly library

## Processing Model

The upload path is asynchronous and approval-based:

1. `components/pdf-uploader.tsx` extracts PDF text and posts it to `/api/upload-pdf`.
2. `app/api/upload-pdf/route.ts` validates the payload and starts `processPDFWorkflow`.
3. `lib/pdf-workflow.ts` creates the chapter map, waits for approval, then processes approved sections with bounded concurrency.
4. `components/pdf-uploader.tsx` polls `/api/upload-pdf/status?runId=...`.
5. `/api/upload-pdf/stream?runId=...` streams workflow progress events for the processing UI.
6. When the workflow completes, the generated report is saved locally and opened in the reader.

Because chapter-map approval is required, synchronous `{ wait: true }` uploads are rejected.

## Key Routes

- `POST /api/upload-pdf` starts a Workflow run.
- `GET /api/upload-pdf/status?runId=...` returns running, approval, failed, or completed status.
- `GET /api/upload-pdf/stream?runId=...` streams NDJSON progress events.
- `POST /api/upload-pdf/chapter-map` resumes the approval hook with edited section titles.
- `POST /api/upload-pdf/cancel` cancels a running Workflow run.
- `POST /api/chat` answers questions against the current report context.

## Guardrails

PDF processing limits live in `lib/pdf-limits.ts`. The app validates request size, uploaded file size, page count, extracted text length, chapter count, chapter text size, and prompt input size before expensive processing.

The current defaults are tuned for local experimentation rather than production throughput.

## Getting Started

Use Node.js `22.13.0` or newer. This repo includes `.nvmrc` and declares npm `11.12.1` in `package.json`.

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Add your OpenAI key:

```bash
OPENAI_API_KEY=your_key_here
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

Run these before pushing changes:

```bash
npm run lint
npm run typecheck
npm run build
```

`npm run lint` should exit with zero warnings.

## Repository Notes

- Old generated project scaffolding has been removed from the app source.
- Workflow build output is generated under `app/.well-known/workflow/v1/` and ignored by git.
- `.env`, `.env.*`, `.next/`, `.vercel/`, `node_modules/`, and TypeScript build info are ignored.
- The current git remote is `git@github.com:packetloss404/paperscout.git`.

## Next Product Work

- Replace browser-local report storage with durable storage.
- Add account/auth boundaries before multi-user usage.
- Decide how Scout Board evidence should be attached, reviewed, and exported.
- Revisit dependency advisories once Workflow/Next transitive updates are available without breaking the app.
