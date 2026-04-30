# PaperScout

PaperScout turns dense reports and research papers into AI-generated research intelligence: analyst briefs, claim cards, caveats, citation leads, skeptic checks, weird findings, and follow-up research trails.

## Hackathon Track

Primary focus: **Track 1 - Vercel Workflow / WDK durable async agents**.

The UI was scaffolded and iterated with **v0**, but this version does not include a real MCP server connection. The PDF processing path now uses Workflow SDK for orchestration and AI SDK/OpenAI calls inside workflow steps.

## What It Does

- Upload a PDF in the browser.
- Extract text client-side with `pdfjs-dist`.
- Start a Workflow SDK run from `/api/upload-pdf`.
- Run AI processing inside a `use step` function.
- Generate a chapter map, polished Markdown chapters, research intelligence, citation leads, skeptic checks, and a portable Scout Board.
- Store completed reports in browser `localStorage` for a simple hackathon-friendly library.

## Workflow Implementation

The implemented processing path is:

- `components/pdf-uploader.tsx` extracts PDF text and POSTs it to `/api/upload-pdf`.
- `app/api/upload-pdf/route.ts` starts `processPDFWorkflow` with `workflow/api`.
- `lib/pdf-workflow.ts` defines `processPDFWorkflow` with `use workflow`.
- `processPDFWorkflow` calls `processPDFStep`, which runs under `use step` and performs the AI SDK/OpenAI work.

The route still returns the same response shape expected by the UI:

```ts
{
  pdfId: string,
  status: string,
  book: PDF
}
```

## Tech Stack

- Next.js 16 and React 19
- v0 for UI scaffolding
- Workflow SDK for durable processing orchestration
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
- The current implementation keeps the existing synchronous upload UX by awaiting the workflow return value.
- A production version should move large PDF text and completed books into durable storage instead of passing/storing full document text through request and browser-local flows.

## Built With v0

This repository is linked to a v0 project for continued UI iteration:

[Continue working on v0](https://v0.app/chat/projects/prj_zgEW7eAduyHSS78jPqAaEtYvl6bb)

<a href="https://v0.app/chat/api/kiro/clone/packetloss404/v0-paperdrive" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
