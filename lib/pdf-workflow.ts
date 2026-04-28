import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";

interface ChapterResult {
  id: string;
  title: string;
  content: string;
  originalText: string;
}

export async function processPDF(
  pdfId: string,
  title: string,
  rawText: string,
  pageCount: number
): Promise<{ status: string; chapters?: ChapterResult[]; error?: string }> {
  try {
    await db.updatePDFStatus(pdfId, "processing");

    const chapterMap = await analyzeAndChunk(rawText);

    await db.savePDF({
      id: pdfId,
      title,
      fileName: title,
      pageCount,
      dateAdded: new Date(),
      content: rawText,
      chapters: chapterMap.map((ch, i) => ({
        id: `ch-${i + 1}`,
        title: ch.title,
        content: ch.title,
      })),
      status: "processing",
    });

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

    await db.savePDF({
      id: pdfId,
      title,
      fileName: title,
      pageCount,
      dateAdded: new Date(),
      content: rawText,
      chapters: processedChapters.map((ch, i) => ({
        id: `ch-${i + 1}`,
        title: ch.title,
        content: ch.markdown,
      })),
      status: "complete",
    });

    return { status: "complete", chapters: processedChapters };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Processing failed";
    console.error("processPDF error:", msg);
    await db.updatePDFStatus(pdfId, "error");
    return { status: "error", error: msg };
  }
}

async function analyzeAndChunk(text: string) {
  const { text: chunked } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are a research paper analyzer. Your job is to:
1. Identify the logical chapters/sections of the paper based on content structure
2. Extract a good title for each chapter (keep it short, 3-8 words)
3. Return a JSON array of chapters with their titles and the text content for each

Rules:
- Split by major sections: Introduction, Methods, Results, Discussion, Conclusion, etc.
- Also split long sections into subsections if needed
- Include chapter titles that are descriptive
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
    system: `You are an academic paper formatter. Convert raw extracted text into clean Markdown.

Rules:
- Use proper Markdown headings (# for chapter title, ## for sections)
- Convert lists to proper Markdown lists
- Keep LaTeX math as-is: $inline$ and $$display$$ formulas
- Mark figures as: ![Figure N: description](fig-n)
- Mark tables as: Table N: description
- Preserve citations in [AuthorYear] format
- Break long paragraphs into readable chunks
- Add section headers where logical (Background, Methods, Results, etc.)
- Keep the content accurate - do not add information not in the source

Return ONLY the converted Markdown content, no explanations.`,
    prompt: `Convert this chapter to clean Markdown:\n\nTitle: ${title}\n\n${text.slice(0, 8000)}`,
  });

  return {
    title,
    markdown: markdown.trim(),
    originalText: text,
  };
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
