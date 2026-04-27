import * as pdfjsLib from 'pdfjs-dist';
import { Chapter } from './db';

// Configure worker for browser environment
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  console.log('[v0] Worker source set to:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

export interface ExtractedContent {
  text: string;
  chapters: Chapter[];
  pageCount: number;
}

export async function extractPDFContent(file: File): Promise<ExtractedContent> {
  try {
    console.log('[v0] PDF extraction starting');
    const arrayBuffer = await file.arrayBuffer();
    console.log('[v0] File read, size:', arrayBuffer.byteLength);
    
    console.log('[v0] Loading PDF document...');
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('[v0] PDF loaded, pages:', pdf.numPages);
    const pageCount = pdf.numPages;

    let fullText = '';

    // Extract text from pages (limit to first 20 pages for performance)
    const maxPages = Math.min(pageCount, 20);
    console.log('[v0] Extracting text from', maxPages, 'pages');
    
    for (let i = 1; i <= maxPages; i++) {
      try {
        console.log('[v0] Getting page', i);
        const page = await pdf.getPage(i);
        console.log('[v0] Got page', i, ', extracting text');
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
        console.log('[v0] Extracted page', i, ', text length:', pageText.length);
      } catch (pageError) {
        console.warn(`[v0] Error extracting page ${i}:`, pageError);
        continue;
      }
    }

    console.log('[v0] Text extraction complete, total length:', fullText.length);

    // Parse chapters from content
    const chapters = parseChapters(fullText);
    console.log('[v0] Chapters parsed:', chapters.length);

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
