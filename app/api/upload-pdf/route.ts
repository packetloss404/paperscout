import { NextRequest, NextResponse } from 'next/server';
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

    const result = await processPDF(pdfId, title, extractedText, pageCount || 1);

    if (result.status === 'error') {
      return NextResponse.json(
        { error: result.error || 'Processing failed', pdfId, status: 'error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pdfId, status: result.status, book: result.book });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
