import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processPDF } from '@/lib/pdf-workflow';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfId, fileName, pageCount, extractedText } = body;

    if (!pdfId || !fileName || !extractedText) {
      return NextResponse.json(
        { error: 'Missing required fields: pdfId, fileName, extractedText' },
        { status: 400 }
      );
    }

    const title = fileName.replace(/\.pdf$/i, '');

    await db.savePDF({
      id: pdfId,
      title,
      fileName,
      pageCount: pageCount || 1,
      dateAdded: new Date(),
      content: extractedText,
      status: 'processing',
    });

    const result = await processPDF(pdfId, title, extractedText, pageCount || 1);

    if (result.status === 'error') {
      return NextResponse.json(
        { error: result.error || 'Processing failed', pdfId, status: 'error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pdfId, status: result.status, error: result.error });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
