import * as pdfjsLib from 'pdfjs-dist';
import { Chapter } from './db';

// Configure worker for browser environment
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface ExtractedContent {
  text: string;
  chapters: Chapter[];
  pageCount: number;
}

export async function extractPDFContent(file: File): Promise<ExtractedContent> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    let fullText = '';

    // Extract text from pages (limit to first 100 pages for performance)
    const maxPages = Math.min(pageCount, 100);
    for (let i = 1; i <= maxPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`[v0] Error extracting page ${i}:`, pageError);
        continue;
      }
    }

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

  // If no chapters detected, create sections
  if (chapters.length === 0) {
    const sections = text.split('\n\n').filter(s => s.trim().length > 0);
    for (let i = 0; i < Math.min(sections.length, 20); i++) {
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

  return chapters.slice(0, 100);
}

function isLikelyTitle(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length < 100 &&
    /^[A-Z]/.test(trimmed) &&
    !trimmed.includes('    ')
  );
}
