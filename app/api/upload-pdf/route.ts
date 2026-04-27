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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    if (!file || !pdfId) {
      return NextResponse.json({ error: 'Missing file or pdfId' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Basic text extraction: look for printable ASCII characters
    const bytes = new Uint8Array(buffer);
    let text = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
        text += String.fromCharCode(byte);
      }
    }

    // Clean up extracted text
    const cleanText = text
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .join('\n')
      .slice(0, 50000);

    // Parse into chapters
    const chapters = cleanText
      .split('\n\n')
      .slice(0, 20)
      .map((section, idx) => ({
        id: `ch-${idx}`,
        title: section.split('\n')[0].slice(0, 60) || `Section ${idx + 1}`,
        content: section,
      }));

    // Save to database
    await db.savePDF({
      id: pdfId,
      title: file.name.replace(/\.pdf$/i, ''),
      fileName: file.name,
      pageCount: Math.ceil(buffer.length / 1024),
      dateAdded: new Date(),
      content: cleanText,
      chapters,
      status: 'complete',
    });

    return NextResponse.json({ pdfId, status: 'complete' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
