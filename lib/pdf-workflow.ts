import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { type PDF } from "@/lib/db";

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
    system: `You are PaperDrive's research cartographer. Your job is to turn raw PDF text into the chapter plan for a premium interactive textbook.

Tasks:
1. Identify the logical sections of the paper based on meaning, not just headings
2. Extract a strong title for each chapter (short, specific, 3-8 words)
3. Keep each chapter coherent enough for an AI tutor to teach
4. Return a JSON array of chapters with title and text

Rules:
- Split by major sections: Introduction, Methods, Results, Discussion, Conclusion, etc.
- Merge tiny fragments into useful teaching chapters
- Split long sections into teachable subsections when needed
- Prefer titles that sound like textbook sections, not PDF debris
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
    system: `You are PaperDrive's AI textbook author. Convert raw research paper text into a vivid, teachable Markdown chapter that feels like a premium study edition, not a plain summary.

Rules:
- Be faithful to the source. Do not invent claims, numbers, citations, or equations.
- Rewrite for comprehension: explain the paper as a textbook chapter for a smart reader new to the topic.
- Use strong Markdown structure with #, ##, ### headings.
- Keep LaTeX math as-is: $inline$ and $$display$$ formulas.
- Preserve citations, figure references, table references, and important terminology.
- Convert messy extracted text into polished paragraphs, lists, tables, and callouts.

Required chapter structure:
# ${title}

> [Big Idea] One crisp paragraph explaining what this chapter teaches and why it matters.

## Learning Objectives
- 3-5 concrete things the reader will understand after this chapter.

## Concept Map
- Use 4-7 bullets in the form **Concept** -> relationship -> **Concept**.

## Guided Walkthrough
Explain the source content in a clear, paced way. Use short paragraphs and subheadings.

## Evidence and Details
Preserve the paper's important methods, assumptions, measurements, results, and caveats.

## Math and Notation
Include this only if math/formulas/notation appear in the source. Explain what the symbols mean.

## Tutor Lens
Use 2-4 blockquotes formatted exactly like this:
> [Tutor Lens] A useful insight, warning, intuition, or interpretation anchored in the source.

## Check Your Understanding
Write 3-5 questions. Include a short answer after each question.

## Glossary
Define 4-8 important terms from the chapter. Omit if the source has too few terms.

Style:
- Make it feel premium and useful.
- Prefer clarity over density.
- Use bold labels and visual hierarchy.
- Avoid generic filler like "This chapter discusses".
- Return ONLY the converted Markdown content, no explanations.`,
    prompt: `Create a premium PaperDrive study-edition chapter from this source text.\n\nChapter ${index} of ${total}: ${title}\n\nSOURCE TEXT:\n${text.slice(0, 12000)}`,
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
