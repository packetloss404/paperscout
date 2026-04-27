import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import Busboy from 'busboy';
import { Readable } from 'stream';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const bb = Busboy({ headers: request.headers as any });
    let file: Buffer | null = null;
    let pdfId: string | null = null;
    let fileName: string | null = null;

    await new Promise<void>((resolve, reject) => {
      bb.on('file', (fieldname: string, stream: any, info: any) => {
        if (fieldname === 'file') {
          fileName = info.filename;
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => {
            file = Buffer.concat(chunks);
          });
          stream.on('error', reject);
        }
      });

      bb.on('field', (fieldname: string, value: string) => {
        if (fieldname === 'pdfId') {
          pdfId = value;
        }
      });

      bb.on('finish', resolve);
      bb.on('error', reject);

      // Pipe request body to busboy
      if (request.body) {
        Readable.from(request.body as any).pipe(bb);
      }
    });

    if (!file || !pdfId) {
      return NextResponse.json({ error: 'Missing file or pdfId' }, { status: 400 });
    }

    // Basic text extraction: look for printable ASCII characters
    const bytes = new Uint8Array(file);
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
      title: (fileName || 'document').replace(/\.pdf$/i, ''),
      fileName: fileName || 'document.pdf',
      pageCount: Math.ceil(file.length / 1024),
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
