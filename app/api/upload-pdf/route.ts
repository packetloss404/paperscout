import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Read the entire request body as buffer without going through formData parser
    const buffer = await request.arrayBuffer();
    
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty request' }, { status: 400 });
    }

    // Parse multipart form data manually
    const bodyBuffer = Buffer.from(buffer);
    const contentType = request.headers.get('content-type') || '';
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    const boundary = boundaryMatch ? boundaryMatch[1] : null;

    if (!boundary) {
      return NextResponse.json({ error: 'Invalid multipart form' }, { status: 400 });
    }

    // Split by boundary
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    let file: Buffer | null = null;
    let pdfId: string | null = null;
    let fileName: string = 'document.pdf';

    let currentPos = 0;
    while (currentPos < bodyBuffer.length) {
      const nextBoundary = bodyBuffer.indexOf(boundaryBuffer, currentPos);
      if (nextBoundary === -1) break;

      const sectionStart = currentPos + boundaryBuffer.length;
      let sectionEnd = bodyBuffer.indexOf(boundaryBuffer, sectionStart);
      if (sectionEnd === -1) sectionEnd = bodyBuffer.length;

      const section = bodyBuffer.slice(sectionStart, sectionEnd);
      const sectionStr = section.toString('utf8', 0, Math.min(500, section.length));

      // Check if this is the file or pdfId field
      if (sectionStr.includes('name="file"')) {
        const headerEnd = section.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const fileStart = headerEnd + 4;
          const fileEnd = section.lastIndexOf('\r\n');
          file = section.slice(fileStart, fileEnd);
          
          // Extract filename
          const filenameMatch = sectionStr.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            fileName = filenameMatch[1];
          }
        }
      } else if (sectionStr.includes('name="pdfId"')) {
        const headerEnd = section.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const dataStart = headerEnd + 4;
          const dataEnd = section.lastIndexOf('\r\n');
          pdfId = section.toString('utf8', dataStart, dataEnd);
        }
      }

      currentPos = nextBoundary + 1;
    }

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
      title: fileName.replace(/\.pdf$/i, ''),
      fileName,
      pageCount: Math.ceil(file.length / 1024),
      dateAdded: new Date(),
      content: cleanText,
      chapters,
      status: 'complete',
    });

    return NextResponse.json({ pdfId, status: 'complete' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    console.error('[v0] Upload error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
