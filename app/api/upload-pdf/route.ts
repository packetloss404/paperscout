import { NextRequest, NextResponse } from 'next/server';
import { put, get } from '@vercel/blob';
import pdfParse from 'pdf-parse';
import { db } from '@/lib/db';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    console.log('[v0] upload-pdf: file:', file?.name, 'size:', file?.size);

    if (!file || !pdfId) {
      return NextResponse.json({ error: 'Missing file or pdfId' }, { status: 400 });
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    console.log('[v0] Uploading to Blob...');
    const blob = await put(`pdfs/${Date.now()}-${file.name}`, file, { access: 'private' });
    console.log('[v0] Uploaded to:', blob.pathname);

    console.log('[v0] Reading from Blob...');
    const blobData = await get(blob.pathname, { access: 'private' });
    if (!blobData) throw new Error('Failed to read uploaded blob');

    console.log('[v0] Converting stream to buffer...');
    const arrayBuffer = await blobData.stream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[v0] Buffer size:', buffer.length);

    console.log('[v0] Extracting text with pdf-parse...');
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;
    const pageCount = pdfData.numpages;
    console.log('[v0] Extracted', fullText.length, 'chars,', pageCount, 'pages');

    const chapters = parseChapters(fullText);
    console.log('[v0] Parsed', chapters.length, 'chapters');

    console.log('[v0] Saving to DB...');
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

    console.log('[v0] Done!');
    return NextResponse.json({ pdfId, status: 'complete' });
  } catch (error) {
    console.error('[v0] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to process PDF';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function parseChapters(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const chapters = [];
  let curr = null;
  let buf = [];

  for (const line of lines) {
    if (line.trim().length < 100 && /^[A-Z]/.test(line.trim())) {
      if (curr) {
        curr.content = buf.join('\n').trim();
        chapters.push(curr);
      }
      curr = { id: Math.random().toString(36).slice(2, 9), title: line.trim(), content: '' };
      buf = [];
    } else if (curr) {
      buf.push(line);
    }
  }

  if (curr) {
    curr.content = buf.join('\n').trim();
    chapters.push(curr);
  }

  if (chapters.length === 0) {
    const secs = text.split('\n\n').filter(s => s.trim());
    for (let i = 0; i < Math.min(secs.length, 20); i++) {
      chapters.push({
        id: Math.random().toString(36).slice(2, 9),
        title: secs[i].split('\n')[0].slice(0, 60) || `Section ${i + 1}`,
        content: secs[i],
      });
    }
  }

  return chapters.slice(0, 100);
}
