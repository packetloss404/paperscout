import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    if (!file || !pdfId) {
      return NextResponse.json(
        { error: 'Missing file or PDF ID' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract PDF content using pdfjs
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pageCount = pdf.numPages;
    
    let fullText = '';
    const maxPages = Math.min(pageCount, 50);
    
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
        console.warn(`Error extracting page ${i}:`, pageError);
        continue;
      }
    }

    // Parse chapters from extracted text
    const chapters = parseChapters(fullText);

    // Save to database
    await db.savePDF({
      id: pdfId,
      title: file.name.replace(/\.pdf$/i, ''),
      fileName: file.name,
      pageCount,
      dateAdded: new Date(),
      content: fullText,
      chapters,
      status: 'complete',
    });

    return NextResponse.json({
      pdfId,
      status: 'complete',
    });
  } catch (error) {
    console.error('[v0] PDF processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process PDF' },
      { status: 500 }
    );
  }
}

function parseChapters(text: string) {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const chapters = [];
  let currentChapter = null;
  let contentBuffer = [];

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
      const sectionLines = section.split('\n');
      const title = sectionLines[0].slice(0, 60) || `Section ${i + 1}`;
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
