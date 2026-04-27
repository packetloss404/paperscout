import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { get } from '@vercel/blob';
import pdfParse from 'pdf-parse';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfId, blobPathname, fileName } = body;

    if (!pdfId || !blobPathname) {
      return NextResponse.json(
        { error: 'Missing pdfId or blob pathname' },
        { status: 400 }
      );
    }

    console.log('[v0] Processing PDF:', blobPathname);

    // Fetch the PDF from blob storage
    const blob = await get(blobPathname, { access: 'private' });
    
    if (!blob) {
      return NextResponse.json(
        { error: 'PDF not found in storage' },
        { status: 404 }
      );
    }

    console.log('[v0] Downloaded blob, size:', blob.blob.size);

    // Convert blob stream to buffer
    const buffer = await blob.stream.arrayBuffer().then(ab => Buffer.from(ab));

    console.log('[v0] Extracting text with pdf-parse');
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;
    const pageCount = pdfData.numpages;

    console.log('[v0] Extracted', fullText.length, 'characters from', pageCount, 'pages');

    const chapters = parseChapters(fullText);
    console.log('[v0] Parsed', chapters.length, 'chapters');

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

    console.log('[v0] PDF saved successfully');

    return NextResponse.json({
      pdfId,
      status: 'complete',
    });
  } catch (error) {
    console.error('[v0] PDF processing error:', error);
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

