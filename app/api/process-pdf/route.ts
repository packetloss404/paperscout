import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractPDFContent } from '@/lib/pdf-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    if (!file || !pdfId) {
      return NextResponse.json(
        { error: 'Missing file or PDF ID' },
        { status: 400 }
      );
    }

    // Save PDF with processing status
    const fileName = file.name;
    const title = fileName.replace(/\.pdf$/i, '');

    await db.savePDF({
      id: pdfId,
      title,
      fileName,
      pageCount: 0,
      dateAdded: new Date(),
      status: 'processing',
    });

    // Process PDF in background
    processInBackground(file, pdfId, title);

    return NextResponse.json({
      pdfId,
      status: 'processing',
    });
  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}

async function processInBackground(file: File, pdfId: string, title: string) {
  try {
    // Extract content from PDF
    const content = await extractPDFContent(file);

    // Save processed PDF
    await db.savePDF({
      id: pdfId,
      title,
      fileName: file.name,
      pageCount: content.pageCount,
      dateAdded: new Date(),
      content: content.text,
      chapters: content.chapters,
      status: 'complete',
    });

    console.log(`[v0] PDF ${pdfId} processing complete`);
  } catch (error) {
    console.error(`[v0] PDF ${pdfId} processing error:`, error);
    await db.updatePDFStatus(pdfId, 'error');
  }
}
