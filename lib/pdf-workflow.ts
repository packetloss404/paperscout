import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { type CitationSignal, type PDF, type ResearchIntelligence, type ResearchTrail } from "@/lib/db";

interface ChapterResult {
  title: string;
  markdown: string;
  originalText: string;
}

export async function processPDF(
  pdfId: string,
  title: string,
  rawText: string,
  pageCount: number
): Promise<{ status: string; book?: PDF; error?: string }> {
  try {
    const chapterMap = await analyzeAndChunk(rawText);
    const intelligencePromise = generateResearchIntelligence(title, rawText);

    const processedChapters = await Promise.all(
      chapterMap.map((chunk, i) =>
        convertChapter(
          pdfId,
          i + 1,
          chapterMap.length,
          chunk.title,
          chunk.text
        )
      )
    );
    const intelligence = await intelligencePromise;

    const book: PDF = {
      id: pdfId,
      title,
      fileName: `${title}.pdf`,
      pageCount,
      dateAdded: new Date().toISOString(),
      content: rawText,
      chapters: processedChapters.map((ch, i) => ({
        id: `ch-${i + 1}`,
        title: ch.title,
        content: ch.markdown,
      })),
      intelligence,
      status: "complete",
    };

    return { status: "complete", book };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    console.error("processPDF error:", msg);
    return { status: "error", error: msg };
  }
}

async function analyzeAndChunk(text: string) {
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
    prompt: `Analyze this research paper and chunk it into logical chapters. Return a JSON array.\n\n${text.slice(0, 50000)}`,
  });

  try {
    const cleaned = chunked.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const fallback = splitNaive(text);
    return fallback;
  }
}

async function convertChapter(
  pdfId: string,
  index: number,
  total: number,
  title: string,
  text: string
): Promise<{ title: string; markdown: string; originalText: string }> {
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
    prompt: `Create a premium PaperScout research-intelligence chapter from this source text.\n\nSection ${index} of ${total}: ${title}\n\nSOURCE TEXT:\n${text.slice(0, 12000)}`,
  });

  return {
    title,
    markdown: markdown.trim(),
    originalText: text,
  };
}

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
  ]
}

Rules:
- Do not fabricate URLs.
- Do not add claims not supported by the source.
- Produce 4-7 researchTrails.
- Produce 4-8 citationSignals. These should focus on footnote/citation/source trails, named reports, datasets, standards, authors, and methods.
- Make queries specific enough to be useful in Google Scholar, Semantic Scholar, arXiv, Crossref, OpenAlex, or normal web search.
- Include trails for adjacent concepts, cited methods, important organizations/datasets, and skeptical follow-up where possible.`,
    prompt: `Analyze this document and produce a research intelligence brief.\n\nTitle: ${title}\n\nDOCUMENT TEXT:\n${text.slice(0, 60000)}`,
  });

  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as Omit<ResearchIntelligence, "researchTrails"> & {
      researchTrails?: Array<Omit<ResearchTrail, "links">>;
      citationSignals?: Array<Omit<CitationSignal, "links">>;
    };

    return {
      category: parsed.category || "Research report",
      executiveBrief: parsed.executiveBrief || "No executive brief generated.",
      whyItMatters: parsed.whyItMatters || "No implications generated.",
      keyClaims: Array.isArray(parsed.keyClaims) ? parsed.keyClaims.slice(0, 6) : [],
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
    };
  } catch {
    const fallbackQuery = title.replace(/\.pdf$/i, "");
    return {
      category: "Research report",
      executiveBrief: "The document was processed, but the intelligence brief could not be parsed. Use the research links below as a starting point.",
      whyItMatters: "The report appears dense enough to warrant follow-up research across scholarly and web sources.",
      keyClaims: [],
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
    };
  }
}

function normalizeCitationType(value: unknown): CitationSignal["type"] {
  if (value === "citation" || value === "footnote" || value === "source" || value === "dataset" || value === "method") {
    return value;
  }
  return "source";
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
