# PaperScout

PaperScout turns dense reports and research papers into AI-generated research intelligence: analyst briefs, claim cards, caveats, citation leads, skeptic checks, weird findings, and follow-up research trails.

## Hackathon Track

Primary focus: **Track 1 - Vercel Workflow / WDK durable async agents**.

The UI was scaffolded and iterated with **v0**, but this version does not include a real MCP server connection. The PDF processing path now uses Workflow SDK for orchestration and AI SDK/OpenAI calls inside workflow steps.

## What It Does

- Upload a PDF in the browser.
- Extract text client-side with `pdfjs-dist`.
- Start a Workflow SDK run from `/api/upload-pdf`.
- Poll Workflow run status from `/api/upload-pdf/status`.
- Run AI processing across multiple `use step` functions.
- Stream live Workflow progress into a Mission Control panel.
- Pause for human chapter-map approval before expensive fan-out processing.
- Demonstrate retryable step recovery with an opt-in demo failure.
- Cancel or resume active Workflow runs from the upload UI.
- Generate a chapter map, polished Markdown chapters, research intelligence, citation leads, skeptic checks, and a portable Scout Board.
- Store completed reports in browser `localStorage` for a simple hackathon-friendly library.

## Workflow Implementation

The implemented processing path is:

- `components/pdf-uploader.tsx` extracts PDF text and POSTs it to `/api/upload-pdf`.
- `app/api/upload-pdf/route.ts` starts `processPDFWorkflow` with `workflow/api` and returns a `runId`.
- `components/pdf-uploader.tsx` polls `/api/upload-pdf/status?runId=...` until the Workflow run returns a completed book.
- `components/pdf-uploader.tsx` also reads `/api/upload-pdf/stream?runId=...` for live mission-control events.
- `lib/pdf-workflow.ts` defines `processPDFWorkflow` with `use workflow`.
- `processPDFWorkflow` uses a short durable `sleep()` checkpoint, a deterministic chapter-map approval hook, and fan-out chapter conversion with `Promise.all`.
- AI work is split across `use step` functions for progress events, retry demo, chapter mapping, research intelligence, per-chapter conversion, and final book assembly.

Additional Track 1 routes:

- `GET /api/upload-pdf/stream?runId=...` streams NDJSON progress events from `run.getReadable()`.
- `POST /api/upload-pdf/chapter-map` resumes the approval hook with edited chapter titles.
- `POST /api/upload-pdf/cancel` cancels a running Workflow run.

The upload route starts quickly with:

```ts
{
  pdfId: string,
  runId: string,
  status: 'running'
}
```

The status route returns the completed book when the run finishes:

```ts
{
  runId: string,
  status: 'complete',
  workflowStatus: 'completed',
  book: PDF
}
```

While the workflow is paused, the status route returns:

```ts
{
  runId: string,
  status: 'awaiting_chapter_map',
  workflowStatus: string,
  chapterMap: Array<{ index: number, title: string, characters: number }>
}
```

## Tech Stack

- Next.js 16 and React 19
- v0 for UI scaffolding
- Workflow SDK for durable processing orchestration
- Workflow hooks, streams, cancellation, retryable steps, and run polling
- AI SDK with OpenAI for report analysis
- pdfjs-dist for client-side PDF text extraction
- React Markdown, KaTeX, and Tailwind CSS for rendering

## Getting Started

Install dependencies:

```bash
npm install
```

Set an OpenAI key in your local environment:

```bash
OPENAI_API_KEY=your_key_here
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

Useful checks:

```bash
npx tsc --noEmit --pretty false
npm run build
```

`npm run lint` is currently defined, but this repo does not have an `eslint` binary installed.

## Notes

- Workflow build output is generated under `app/.well-known/workflow/v1/` and ignored by git.
- The current implementation uses Workflow run IDs and polling for the upload flow. The API still supports `{ wait: true }` for a synchronous compatibility path.
- A production version should move large PDF text and completed books into durable storage instead of passing/storing full document text through request and browser-local flows.

## Built With v0

This repository is linked to a v0 project for continued UI iteration:

[Continue working on v0](https://v0.app/chat/projects/prj_zgEW7eAduyHSS78jPqAaEtYvl6bb)

<a href="https://v0.app/chat/api/kiro/clone/packetloss404/v0-paperdrive" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
