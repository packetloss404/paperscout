import * as pdfjsLib from 'pdfjs-dist';
import { Chapter } from './db';

// Set up the worker for Node.js environment
if (typeof window === 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.min.js');
}

export interface ExtractedContent {
  text: string;
  chapters: Chapter[];
  pageCount: number;
}

export async function extractPDFContent(file: File | Buffer): Promise<ExtractedContent> {
  try {
    let data: ArrayBuffer;
    
    // Handle both File (browser) and Buffer (Node.js) inputs
    if (file instanceof File) {
      data = await file.arrayBuffer();
    } else if (Buffer.isBuffer(file)) {
      data = file.buffer;
    } else {
      throw new Error('Invalid file input');
    }

    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pageCount = pdf.numPages;

    let fullText = '';

    // Extract text from all pages
    for (let i = 1; i <= Math.min(pageCount, 50); i++) {
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

    // Parse chapters from content (basic structure detection)
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
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    // Heuristic: lines that are short, on separate lines, or contain numbers might be titles
    if (line.trim().length > 0 && isLikelyTitle(line)) {
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

  // If no chapters detected, create a single chapter with all content
  if (chapters.length === 0) {
    chapters.push({
      id: '1',
      title: 'Content',
      content: text,
    });
  }

  return chapters;
}

function isLikelyTitle(line: string): boolean {
  const trimmed = line.trim();
  // Check if it looks like a title (short, doesn't end with period or comma)
  return (
    trimmed.length > 0 &&
    trimmed.length < 100 &&
    !trimmed.includes('  ') &&
    !/^[a-z]/.test(trimmed)
  );
}
