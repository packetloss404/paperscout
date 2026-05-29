import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHook, getStepMetadata, getWorkflowMetadata, getWritable, RetryableError, sleep } from "workflow";
import { PDF_PROCESSING_LIMITS, truncateString } from "@/lib/pdf-limits";
import {
  type CitationSignal,
  type ClaimCard,
  type PDF,
  type ResearchIntelligence,
  type ResearchTrail,
  type SkepticSignal,
  type WeirdFinding,
} from "@/lib/db";

interface ChapterResult {
  title: string;
  markdown: string;
}

interface ChapterChunk {
  title: string;
  text: string;
}

export type ChapterMapSummaryItem = {
  [key: string]: string | number;
  index: number;
  title: string;
  characters: number;
};

interface ChapterMapApprovalPayload {
  chapters: Array<{ index: number; title: string }>;
  approvedAt?: string;
}

interface ProcessPDFWorkflowInput {
  pdfId: string;
  title: string;
  rawText: string;
  pageCount: number;
  demoRetry?: boolean;
}

export type ProcessPDFResult = { status: string; book?: PDF; error?: string };

export type PDFWorkflowEvent = {
  type:
    | "workflow_started"
    | "retry_demo"
    | "analyzing"
    | "chapters_discovered"
    | "awaiting_approval"
    | "approval_received"
    | "intelligence_started"
    | "intelligence_completed"
    | "chapter_started"
    | "chapter_completed"
    | "chapter_failed"
    | "assembling_book"
    | "workflow_completed"
    | "workflow_error";
  message: string;
  at: string;
  pdfId?: string;
  title?: string;
  progress?: number;
  runId?: string;
  token?: string;
  chapterIndex?: number;
  chapterTotal?: number;
  chapterTitle?: string;
  chapters?: ChapterMapSummaryItem[];
  error?: string;
};

export async function processPDFWorkflow(
  input: ProcessPDFWorkflowInput
): Promise<ProcessPDFResult> {
  "use workflow";

  const workflowMetadata = getWorkflowMetadata();
  const approvalToken = `chapter-map:${workflowMetadata.workflowRunId}`;

  await emitProgressStep({
    type: "workflow_started",
    message: "Workflow run started",
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    title: input.title,
    runId: workflowMetadata.workflowRunId,
    progress: 3,
  });

  await demoRetryOnceStep({ enabled: input.demoRetry === true, pdfId: input.pdfId });

  await emitProgressStep({
    type: "analyzing",
    message: "Mapping report structure",
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    progress: 10,
  });

  const chapterMap = await analyzeAndChunkStep(input.rawText);
  const chapterSummary = summarizeChapterMap(chapterMap);

  await emitProgressStep({
    type: "chapters_discovered",
    message: `Mapped ${chapterMap.length} sections`,
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    chapters: chapterSummary,
    chapterTotal: chapterMap.length,
    progress: 20,
  });

  const approvalHook = createHook<ChapterMapApprovalPayload>({
    token: approvalToken,
    metadata: {
      kind: "chapter-map-approval",
      pdfId: input.pdfId,
      title: input.title,
      chapters: chapterSummary,
    },
  });

  await emitProgressStep({
    type: "awaiting_approval",
    message: "Waiting for chapter map approval",
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    token: approvalToken,
    chapters: chapterSummary,
    progress: 25,
  });

  const approval = await approvalHook;
  approvalHook.dispose();

  await emitProgressStep({
    type: "approval_received",
    message: "Chapter map approved, resuming workflow",
    at: approval.approvedAt || new Date().toISOString(),
    pdfId: input.pdfId,
    progress: 30,
  });

  const approvedChapterMap = applyChapterTitleApprovals(chapterMap, approval.chapters);
  await sleep("1s");

  await emitProgressStep({
    type: "intelligence_started",
    message: "Generating research intelligence",
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    progress: 35,
  });

  const intelligencePromise = generateResearchIntelligenceStep({
    title: input.title,
    rawText: input.rawText,
  });
  const processedChapters = await convertChaptersWithBoundedConcurrency(
    approvedChapterMap,
    async (chunk, i) =>
      convertChapterWithProgressStep({
        pdfId: input.pdfId,
        index: i + 1,
        total: approvedChapterMap.length,
        title: chunk.title,
        text: chunk.text,
      })
  );
  const intelligence = await intelligencePromise;

  await emitProgressStep({
    type: "intelligence_completed",
    message: "Research intelligence generated",
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    progress: 82,
  });

  await emitProgressStep({
    type: "assembling_book",
    message: "Assembling final PaperScout report",
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    progress: 92,
  });

  const book = await assembleBookStep({
    pdfId: input.pdfId,
    title: input.title,
    rawText: input.rawText,
    pageCount: input.pageCount,
    processedChapters,
    intelligence,
  });

  await emitProgressStep({
    type: "workflow_completed",
    message: "Workflow completed",
    at: new Date().toISOString(),
    pdfId: input.pdfId,
    progress: 100,
  });
  await closeProgressStep();

  return { status: "complete", book };
}

async function emitProgressStep(event: PDFWorkflowEvent): Promise<void> {
  "use step";

  const writer = getWritable<PDFWorkflowEvent>({ namespace: "progress" }).getWriter();

  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

async function closeProgressStep(): Promise<void> {
  "use step";

  await getWritable<PDFWorkflowEvent>({ namespace: "progress" }).close();
}

async function demoRetryOnceStep(input: { enabled: boolean; pdfId: string }): Promise<void> {
  "use step";

  if (!input.enabled) return;

  const metadata = getStepMetadata();
  const writer = getWritable<PDFWorkflowEvent>({ namespace: "progress" }).getWriter();

  try {
    await writer.write({
      type: "retry_demo",
      message: metadata.attempt === 1 ? "Intentional retry demo: first attempt failed" : "Retry demo recovered on the next attempt",
      at: new Date().toISOString(),
      pdfId: input.pdfId,
      progress: 6,
    });
  } finally {
    writer.releaseLock();
  }

  if (metadata.attempt === 1) {
    throw new RetryableError("Intentional one-time retry demo", { retryAfter: "5s" });
  }
}

demoRetryOnceStep.maxRetries = 1;

async function analyzeAndChunkStep(rawText: string): Promise<ChapterChunk[]> {
  "use step";

  return analyzeAndChunk(rawText);
}

async function generateResearchIntelligenceStep(input: {
  title: string;
  rawText: string;
}): Promise<ResearchIntelligence> {
  "use step";

  return generateResearchIntelligence(input.title, input.rawText);
}

async function convertChapterWithProgressStep(input: {
  pdfId: string;
  index: number;
  total: number;
  title: string;
  text: string;
}): Promise<ChapterResult> {
  "use step";

  const writer = getWritable<PDFWorkflowEvent>({ namespace: "progress" }).getWriter();

  try {
    await writer.write({
      type: "chapter_started",
      message: `Converting chapter ${input.index} of ${input.total}`,
      at: new Date().toISOString(),
      pdfId: input.pdfId,
      chapterIndex: input.index,
      chapterTotal: input.total,
      chapterTitle: input.title,
      progress: 35 + Math.round(((input.index - 1) / input.total) * 40),
    });

    const result = await convertChapter(input.pdfId, input.index, input.total, input.title, input.text);

    await writer.write({
      type: "chapter_completed",
      message: `Finished chapter ${input.index} of ${input.total}`,
      at: new Date().toISOString(),
      pdfId: input.pdfId,
      chapterIndex: input.index,
      chapterTotal: input.total,
      chapterTitle: input.title,
      progress: 35 + Math.round((input.index / input.total) * 40),
    });

    return result;
  } catch (error) {
    await writer.write({
      type: "chapter_failed",
      message: `Chapter ${input.index} failed`,
      at: new Date().toISOString(),
      pdfId: input.pdfId,
      chapterIndex: input.index,
      chapterTotal: input.total,
      chapterTitle: input.title,
      error: error instanceof Error ? error.message : "Chapter conversion failed",
    });
    throw error;
  } finally {
    writer.releaseLock();
  }
}

async function assembleBookStep(input: {
  pdfId: string;
  title: string;
  rawText: string;
  pageCount: number;
  processedChapters: ChapterResult[];
  intelligence: ResearchIntelligence;
}): Promise<PDF> {
  "use step";

  return assembleBook(input);
}

export async function processPDF(
  pdfId: string,
  title: string,
  rawText: string,
  pageCount: number
): Promise<ProcessPDFResult> {
  try {
    const chapterMap = await analyzeAndChunk(rawText);
    const intelligencePromise = generateResearchIntelligence(title, rawText);

    const processedChapters = await convertChaptersWithBoundedConcurrency(
      chapterMap,
      (chunk, i) =>
        convertChapter(
          pdfId,
          i + 1,
          chapterMap.length,
          chunk.title,
          chunk.text
        )
    );
    const intelligence = await intelligencePromise;

    const book = assembleBook({ pdfId, title, rawText, pageCount, processedChapters, intelligence });

    return { status: "complete", book };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    console.error("processPDF error:", msg);
    return { status: "error", error: msg };
  }
}

function assembleBook(input: {
  pdfId: string;
  title: string;
  rawText: string;
  pageCount: number;
  processedChapters: ChapterResult[];
  intelligence: ResearchIntelligence;
}): PDF {
  return {
    id: input.pdfId,
    title: input.title,
    fileName: `${input.title}.pdf`,
    pageCount: input.pageCount,
    dateAdded: new Date().toISOString(),
    content: input.rawText,
    chapters: input.processedChapters.map((ch, i) => ({
      id: `ch-${i + 1}`,
      title: ch.title,
      content: ch.markdown,
    })),
    intelligence: input.intelligence,
    status: "complete",
  };
}

function summarizeChapterMap(chapterMap: ChapterChunk[]): ChapterMapSummaryItem[] {
  return chapterMap.map((chapter, index) => ({
    index: index + 1,
    title: truncateString(chapter.title, PDF_PROCESSING_LIMITS.maxChapterTitleCharacters),
    characters: chapter.text.length,
  }));
}

function applyChapterTitleApprovals(
  chapterMap: ChapterChunk[],
  approvedChapters: Array<{ index: number; title: string }>
): ChapterChunk[] {
  const titles = new Map(
    approvedChapters
      .map((chapter) => {
        const title = typeof chapter.title === "string" ? cleanChapterTitle(chapter.title) : "";
        return Number.isInteger(chapter.index) && chapter.index > 0 && title ? [chapter.index, title] as const : null;
      })
      .filter((chapter): chapter is readonly [number, string] => Boolean(chapter))
  );

  return chapterMap.map((chapter, index) => ({
    ...chapter,
    title: titles.get(index + 1) || chapter.title,
  }));
}

async function convertChaptersWithBoundedConcurrency(
  chapterMap: ChapterChunk[],
  convert: (chunk: ChapterChunk, index: number) => Promise<ChapterResult>
): Promise<ChapterResult[]> {
  const results: ChapterResult[] = [];
  const concurrency = Math.max(1, PDF_PROCESSING_LIMITS.chapterConversionConcurrency);

  for (let start = 0; start < chapterMap.length; start += concurrency) {
    const batch = chapterMap.slice(start, start + concurrency);
    const converted = await Promise.all(batch.map((chunk, offset) => convert(chunk, start + offset)));
    results.push(...converted);
  }

  return results;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanChapterTitle(value: string): string {
  return truncateString(
    value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim(),
    PDF_PROCESSING_LIMITS.maxChapterTitleCharacters
  );
}

function normalizeChapterTitle(value: unknown, index: number): string {
  return typeof value === "string" ? cleanChapterTitle(value) || `Section ${index}` : `Section ${index}`;
}

function normalizeChapterText(value: unknown): string {
  if (typeof value !== "string") return "";

  return truncateString(value.replace(/\u0000/g, "").trim(), PDF_PROCESSING_LIMITS.maxChapterTextCharacters);
}

function normalizeChapterCandidates(candidates: unknown[]): ChapterChunk[] {
  const chapters: ChapterChunk[] = [];

  for (const candidate of candidates) {
    if (chapters.length >= PDF_PROCESSING_LIMITS.maxChapterCount) break;
    if (!isObjectRecord(candidate)) continue;

    const text = normalizeChapterText(candidate.text);
    if (!text) continue;

    const index = chapters.length + 1;
    chapters.push({
      title: normalizeChapterTitle(candidate.title, index),
      text,
    });
  }

  return chapters;
}

function normalizeChapterMap(value: unknown, fallbackText: string): ChapterChunk[] {
  const parsedChapters = Array.isArray(value) ? normalizeChapterCandidates(value) : [];
  if (parsedChapters.length > 0) return parsedChapters;

  const fallbackChapters = normalizeChapterCandidates(splitNaive(fallbackText));
  if (fallbackChapters.length > 0) return fallbackChapters;

  return [{ title: "Content", text: truncateString(fallbackText.trim(), PDF_PROCESSING_LIMITS.maxChapterTextCharacters) }];
}

async function analyzeAndChunk(text: string): Promise<ChapterChunk[]> {
  const { text: chunked } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are PaperScout's research cartographer. Your job is to turn raw PDF text into a useful map of a report, research paper, policy document, or technical brief.

Tasks:
1. Identify the logical sections of the paper based on meaning, not just headings
2. Extract a strong title for each chapter (short, specific, 3-8 words)
3. Keep each chapter coherent enough for an analyst to brief from it
4. Return a JSON array of chapters with title and text

Rules:
- Split by major sections: Introduction, Methods, Results, Discussion, Conclusion, etc.
- Merge tiny fragments into useful analytical sections
- Split long sections into readable subsections when needed
- Prefer titles that sound like report sections, not PDF debris
- Preserve ALL content including mathematical notation (keep $...$ and $$...$$ LaTeX intact)
- Preserve code snippets, figures references, table references
- Return EXACTLY this JSON format (no markdown code blocks, just raw JSON):
[{"title":"Chapter Title","text":"The full text content for this chapter..."}]`,
    prompt: `Analyze this research paper and chunk it into logical chapters. Return a JSON array.\n\n${text.slice(0, PDF_PROCESSING_LIMITS.maxAnalysisInputCharacters)}`,
  });

  try {
    const cleaned = chunked.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return normalizeChapterMap(JSON.parse(cleaned) as unknown, text);
  } catch {
    return normalizeChapterMap(splitNaive(text), text);
  }
}

async function convertChapter(
  pdfId: string,
  index: number,
  total: number,
  title: string,
  text: string
): Promise<ChapterResult> {
  const { text: markdown } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are PaperScout's AI research analyst. Convert raw report text into a sharp Markdown analysis chapter for a professional reader who wants signal, context, and useful next steps.

Rules:
- Be faithful to the source. Do not invent claims, numbers, citations, or equations.
- Rewrite for executive comprehension: preserve nuance, but make the section skimmable and useful.
- Use strong Markdown structure with #, ##, ### headings.
- Keep LaTeX math as-is: $inline$ and $$display$$ formulas.
- Preserve citations, figure references, table references, and important terminology.
- Convert messy extracted text into polished paragraphs, bullets, tables, and analyst callouts.

Required chapter structure:
# ${title}

> [Analyst Take] One crisp paragraph explaining what this section is really saying and why it matters.

## What This Section Says
- 3-5 bullets with the core claims, findings, or arguments.

## Why It Matters
Explain the practical, strategic, technical, or policy implications.

## Evidence Worth Keeping
Preserve important data, methods, assumptions, measurements, comparisons, quotes, or caveats.

## Key Entities and Concepts
List named organizations, methods, datasets, technologies, authors, theories, regions, or sectors that matter.

## Math and Notation
Include this only if math/formulas/notation appear in the source. Explain what the symbols mean.

## Caveats and Open Questions
List limitations, ambiguity, missing evidence, or things a skeptical reader should investigate.

## Follow-Up Threads
Write 3-5 specific things the reader should look up next. Phrase them as search-ready topics, not links.

## Citation and Footnote Leads
Identify source trails a professional reader should follow. Include cited works, named authors, datasets, methods, organizations, standards, reports, and footnote-style clues if present. Phrase each as a search-ready lead.

Use 2-4 blockquotes formatted exactly like this:
> [Analyst Note] A useful insight, warning, implication, or interpretation anchored in the source.

Style:
- Make it feel like a premium analyst brief.
- Prefer clarity over density.
- Use bold labels and visual hierarchy.
- Avoid school/study language.
- Return ONLY the converted Markdown content, no explanations.`,
    prompt: `Create a premium PaperScout research-intelligence chapter from this source text.\n\nSection ${index} of ${total}: ${title}\n\nSOURCE TEXT:\n${text.slice(0, PDF_PROCESSING_LIMITS.maxChapterPromptCharacters)}`,
  });

  return {
    title,
    markdown: markdown.trim(),
  };
}

type RawResearchIntelligence = Partial<
  Pick<ResearchIntelligence, "category" | "executiveBrief" | "whyItMatters" | "keyClaims" | "caveats" | "entities">
> & {
  claimCards?: Array<Partial<Omit<ClaimCard, "links">>>;
  citationSignals?: Array<Partial<Omit<CitationSignal, "links">>>;
  researchTrails?: Array<Partial<Omit<ResearchTrail, "links">>>;
  skepticMode?: Array<Partial<Omit<SkepticSignal, "links">>>;
  weirdFindings?: Array<Partial<Omit<WeirdFinding, "links">>>;
};

async function generateResearchIntelligence(
  title: string,
  text: string
): Promise<ResearchIntelligence> {
  const { text: raw } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are a research intelligence analyst. Extract the most useful professional brief from a report or paper and identify credible next-click research trails.

Return ONLY raw JSON in this shape:
{
  "category": "one category such as AI Policy, Climate Risk, Cybersecurity, Public Health, Economics, Education, Energy, Biology, Finance, Legal, Technical Report, Market Research, Social Science, etc.",
  "executiveBrief": "4-6 sentence briefing of what this document says",
  "whyItMatters": "2-4 sentence explanation of why someone should care",
  "keyClaims": ["claim 1", "claim 2", "claim 3"],
  "claimCards": [
    {
      "claim": "one important claim stated as a complete sentence",
      "evidence": "short quoted or paraphrased evidence snippet from the document",
      "caveat": "what would make this claim weaker, narrower, or worth checking",
      "supportLevel": "Strong | Medium | Weak | Needs verification",
      "query": "specific search query to verify or contextualize this claim"
    }
  ],
  "caveats": ["caveat 1", "caveat 2"],
  "entities": ["important organization, method, dataset, author, region, company, technology, or concept"],
  "citationSignals": [
    {
      "label": "named source, footnote clue, method, dataset, or citation trail",
      "type": "citation | footnote | source | dataset | method",
      "reason": "why this source trail matters",
      "query": "specific search query to find this source or related work"
    }
  ],
  "researchTrails": [
    {
      "title": "short label",
      "reason": "why this is worth following",
      "query": "search query a professional would use"
    }
  ],
  "skepticMode": [
    {
      "label": "short skeptical check",
      "type": "assumption | missingEvidence | leap | verification | dissent",
      "reason": "why a skeptical reader should not fully trust this yet",
      "query": "specific search query to verify, falsify, or find disagreement"
    }
  ],
  "weirdFindings": [
    {
      "label": "surprising, buried, or counterintuitive finding",
      "type": "Buried caveat | Big claim | Thin support | Rabbit hole",
      "reason": "why this stands out",
      "query": "specific follow-up search query"
    }
  ]
}

Rules:
- Do not fabricate URLs.
- Do not add claims not supported by the source.
- Produce 4-7 researchTrails.
- Produce 4-8 citationSignals. These should focus on footnote/citation/source trails, named reports, datasets, standards, authors, and methods.
- Produce 3-6 claimCards with evidence and caveats grounded in the document.
- Produce 4-6 skepticMode checks that identify fragile assumptions, missing evidence, suspicious leaps, claims needing verification, or likely dissenters.
- Produce 3-5 weirdFindings that would make a demo audience say "wait, what?" without exaggerating the source.
- Make queries specific enough to be useful in Google Scholar, Semantic Scholar, arXiv, Crossref, OpenAlex, or normal web search.
- Include trails for adjacent concepts, cited methods, important organizations/datasets, and skeptical follow-up where possible.`,
    prompt: `Analyze this document and produce a research intelligence brief.\n\nTitle: ${title}\n\nDOCUMENT TEXT:\n${text.slice(0, PDF_PROCESSING_LIMITS.maxIntelligenceInputCharacters)}`,
  });

  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as RawResearchIntelligence;

    return {
      category: parsed.category || "Research report",
      executiveBrief: parsed.executiveBrief || "No executive brief generated.",
      whyItMatters: parsed.whyItMatters || "No implications generated.",
      keyClaims: Array.isArray(parsed.keyClaims) ? parsed.keyClaims.slice(0, 6) : [],
      claimCards: (parsed.claimCards || []).slice(0, 6).map((card) => ({
        claim: card.claim || "Claim worth verifying",
        evidence: card.evidence || "The source text supports this enough to flag it for review.",
        caveat: card.caveat || "Verify this against the original source and adjacent work.",
        supportLevel: normalizeSupportLevel(card.supportLevel),
        query: card.query || card.claim || title,
        links: buildResearchLinks(card.query || card.claim || title),
      })),
      caveats: Array.isArray(parsed.caveats) ? parsed.caveats.slice(0, 6) : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 12) : [],
      citationSignals: (parsed.citationSignals || []).slice(0, 8).map((signal) => ({
        label: signal.label || signal.query || "Source trail",
        type: normalizeCitationType(signal.type),
        reason: signal.reason || "Useful source trail based on the document.",
        query: signal.query || signal.label || title,
        links: buildResearchLinks(signal.query || signal.label || title),
      })),
      researchTrails: (parsed.researchTrails || []).slice(0, 7).map((trail) => ({
        title: trail.title || trail.query || "Research trail",
        reason: trail.reason || "Useful next search based on the document.",
        query: trail.query || trail.title || title,
        links: buildResearchLinks(trail.query || trail.title || title),
      })),
      skepticMode: (parsed.skepticMode || []).slice(0, 6).map((signal) => ({
        label: signal.label || signal.query || "Skeptical check",
        type: normalizeSkepticType(signal.type),
        reason: signal.reason || "This claim or assumption needs outside verification.",
        query: signal.query || signal.label || title,
        links: buildResearchLinks(signal.query || signal.label || title),
      })),
      weirdFindings: (parsed.weirdFindings || []).slice(0, 5).map((finding) => ({
        label: finding.label || finding.query || "Interesting anomaly",
        type: normalizeWeirdType(finding.type),
        reason: finding.reason || "This stands out as a useful follow-up thread.",
        query: finding.query || finding.label || title,
        links: buildResearchLinks(finding.query || finding.label || title),
      })),
    };
  } catch {
    const fallbackQuery = title.replace(/\.pdf$/i, "");
    return {
      category: "Research report",
      executiveBrief: "The document was processed, but the intelligence brief could not be parsed. Use the research links below as a starting point.",
      whyItMatters: "The report appears dense enough to warrant follow-up research across scholarly and web sources.",
      keyClaims: [],
      claimCards: [],
      caveats: ["The AI-generated intelligence JSON could not be parsed reliably."],
      entities: [],
      citationSignals: [
        {
          label: "Document title trail",
          type: "source",
          reason: "Find citations, mirrors, references, and related discussions around the report.",
          query: fallbackQuery,
          links: buildResearchLinks(fallbackQuery),
        },
      ],
      researchTrails: [
        {
          title: "Search the document title",
          reason: "Find related papers, citations, summaries, and discussions around this report.",
          query: fallbackQuery,
          links: buildResearchLinks(fallbackQuery),
        },
      ],
      skepticMode: [
        {
          label: "Reprocess or manually verify",
          type: "verification",
          reason: "The structured intelligence response could not be parsed, so automated skeptic checks are unavailable.",
          query: fallbackQuery,
          links: buildResearchLinks(fallbackQuery),
        },
      ],
      weirdFindings: [],
    };
  }
}

function normalizeCitationType(value: unknown): CitationSignal["type"] {
  if (value === "citation" || value === "footnote" || value === "source" || value === "dataset" || value === "method") {
    return value;
  }
  return "source";
}

function normalizeSupportLevel(value: unknown): ClaimCard["supportLevel"] {
  if (value === "Strong" || value === "Medium" || value === "Weak" || value === "Needs verification") {
    return value;
  }
  return "Needs verification";
}

function normalizeSkepticType(value: unknown): SkepticSignal["type"] {
  if (value === "assumption" || value === "missingEvidence" || value === "leap" || value === "verification" || value === "dissent") {
    return value;
  }
  return "verification";
}

function normalizeWeirdType(value: unknown): WeirdFinding["type"] {
  if (value === "Buried caveat" || value === "Big claim" || value === "Thin support" || value === "Rabbit hole") {
    return value;
  }
  return "Rabbit hole";
}

function buildResearchLinks(query: string) {
  const encoded = encodeURIComponent(query);
  return [
    {
      label: "Google Scholar",
      source: "Scholar",
      url: `https://scholar.google.com/scholar?q=${encoded}`,
    },
    {
      label: "Semantic Scholar",
      source: "Papers",
      url: `https://www.semanticscholar.org/search?q=${encoded}&sort=relevance`,
    },
    {
      label: "OpenAlex",
      source: "Open research graph",
      url: `https://openalex.org/works?page=1&filter=default.search:${encoded}`,
    },
    {
      label: "Crossref",
      source: "DOI registry",
      url: `https://search.crossref.org/search/works?q=${encoded}`,
    },
    {
      label: "Web search",
      source: "Broader web",
      url: `https://www.google.com/search?q=${encoded}`,
    },
  ];
}

function splitNaive(text: string) {
  const chunks: { title: string; text: string }[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = "";
  let currentTitle = "Introduction";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > 4000) {
      chunks.push({ title: currentTitle, text: currentChunk.trim() });
      currentChunk = "";
      currentTitle = extractTitle(para) || `Section ${chunks.length + 1}`;
    }
    currentChunk += para + "\n\n";
  }

  if (currentChunk.trim()) {
    chunks.push({ title: currentTitle, text: currentChunk.trim() });
  }

  return chunks.length > 0 ? chunks : [{ title: "Content", text: text.slice(0, 10000) }];
}

function extractTitle(text: string): string | null {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length > 5 && firstLine.length < 80) {
    return firstLine.slice(0, 60);
  }
  return null;
}
