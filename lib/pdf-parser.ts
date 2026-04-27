import pdfParse from 'pdf-parse';
import { Chapter } from './db';

export interface ExtractedContent {
  text: string;
  chapters: Chapter[];
  pageCount: number;
}

export async function extractPDFContent(buffer: Buffer): Promise<ExtractedContent> {
  try {
    const data = await pdfParse(buffer);
    const fullText = data.text;
    const pageCount = data.numpages;

    // Parse chapters from content
    const chapters = parseChapters(fullText);

    return {
      text: fullText,
      chapters,
      pageCount,
    };
  } catch (error) {
    console.error('[v0] PDF extraction failed:', error);
    throw error;
  }
}

function parseChapters(text: string): Chapter[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    // Heuristic: lines that are short and start with capital letter might be titles
    if (isLikelyTitle(line)) {
      if (currentChapter) {
        currentChapter.content = contentBuffer.join('\n').trim();
        chapters.push(currentChapter);
      }

      currentChapter = {
        id: Math.random().toString(36).substr(2, 9),
        title: line.trim(),
        content: '',
      };
      contentBuffer = [];
    } else if (currentChapter) {
      contentBuffer.push(line);
    }
  }

  if (currentChapter) {
    currentChapter.content = contentBuffer.join('\n').trim();
    chapters.push(currentChapter);
  }

  // If no chapters detected, create sections by splitting at blank lines
  if (chapters.length === 0) {
    const sections = text.split('\n\n').filter(s => s.trim().length > 0);
    for (let i = 0; i < Math.min(sections.length, 10); i++) {
      const section = sections[i];
      const lines = section.split('\n');
      const title = lines[0].slice(0, 60) || `Section ${i + 1}`;
      chapters.push({
        id: Math.random().toString(36).substr(2, 9),
        title,
        content: section,
      });
    }
  }

  // Limit to reasonable number of chapters
  return chapters.slice(0, 50);
}

function isLikelyTitle(line: string): boolean {
  const trimmed = line.trim();
  // Check if it looks like a title
  return (
    trimmed.length > 0 &&
    trimmed.length < 100 &&
    /^[A-Z]/.test(trimmed) &&
    !trimmed.includes('    ') // not heavily indented
  );
}
