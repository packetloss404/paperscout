import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import pdfParse from 'pdf-parse';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfId, blobUrl, fileName } = body;

    if (!pdfId || !blobUrl) {
      return NextResponse.json(
        { error: 'Missing pdfId or blob URL' },
        { status: 400 }
      );
    }

    // Fetch the PDF from the public blob URL
    const response = await fetch(blobUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch PDF from storage' },
        { status: 404 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;
    const pageCount = pdfData.numpages;

    const chapters = parseChapters(fullText);

    await db.savePDF({
      id: pdfId,
      title: fileName.replace(/\.pdf$/i, ''),
      fileName,
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
    const errorMsg = error instanceof Error ? error.message : 'Failed to process PDF';
    return NextResponse.json(
      { error: errorMsg },
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

