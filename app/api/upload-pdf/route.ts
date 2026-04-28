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

    processPDF(pdfId, title, extractedText, pageCount || 1)
      .then(({ status, error }) => {
        if (error) {
          console.error(`PDF ${pdfId} processing failed:`, error);
          db.updatePDFStatus(pdfId, 'error');
        }
      })
      .catch((err) => {
        console.error(`PDF ${pdfId} workflow error:`, err);
        db.updatePDFStatus(pdfId, 'error');
      });

    return NextResponse.json({ pdfId, status: 'processing' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
