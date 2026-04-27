import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const maxDuration = 300;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] PDF upload started');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    console.log('[v0] File:', file?.name, 'PdfId:', pdfId);

    if (!file || !pdfId) {
      console.log('[v0] Missing file or pdfId');
      return NextResponse.json(
        { error: 'Missing file or PDF ID' },
        { status: 400 }
      );
    }

    console.log('[v0] Converting to buffer');
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('[v0] Extracting text from', buffer.length, 'bytes');
    let extractedText = '';
    const dataView = new Uint8Array(buffer);
    let textChunk = '';
    
    for (let i = 0; i < dataView.length; i++) {
      const byte = dataView[i];
      if (byte >= 32 && byte <= 126) {
        textChunk += String.fromCharCode(byte);
      } else if (textChunk.length > 3) {
        extractedText += ' ' + textChunk;
        textChunk = '';
      } else {
        textChunk = '';
      }
    }

    const fullText = extractedText
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50000);

    console.log('[v0] Extracted text length:', fullText.length);

    const chapters = parseChapters(fullText || `PDF Content: ${file.name}`);
    console.log('[v0] Parsed chapters:', chapters.length);

    console.log('[v0] Saving to database');
    await db.savePDF({
      id: pdfId,
      title: file.name.replace(/\.pdf$/i, ''),
      fileName: file.name,
      pageCount: Math.ceil(buffer.length / 1024),
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
  const lines = text.split(' ').filter(line => line.trim().length > 0);
  const chapters = [];
  let currentChapter = null;
  let contentBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    if (contentBuffer.length > 50) {
      if (currentChapter) {
        currentChapter.content = contentBuffer.join(' ');
        chapters.push(currentChapter);
      }
      const title = lines.slice(i - 10, i).join(' ').slice(0, 60) || `Section ${chapters.length + 1}`;
      currentChapter = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        content: '',
      };
      contentBuffer = [];
    }
    contentBuffer.push(lines[i]);
  }

  if (currentChapter && contentBuffer.length > 0) {
    currentChapter.content = contentBuffer.join(' ');
    chapters.push(currentChapter);
  }

  if (chapters.length === 0) {
    chapters.push({
      id: Math.random().toString(36).substr(2, 9),
      title: 'Content',
      content: text.slice(0, 5000),
    });
  }

  return chapters.slice(0, 100);
}
