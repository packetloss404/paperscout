import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractPDFContent } from '@/lib/pdf-parser';

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] POST /api/process-pdf start');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    console.log('[v0] formData parsed:', { pdfId, fileName: file?.name });

    if (!file || !pdfId) {
      console.log('[v0] Missing file or pdfId');
      return NextResponse.json(
        { error: 'Missing file or PDF ID' },
        { status: 400 }
      );
    }

    // Save PDF with processing status
    const fileName = file.name;
    const title = fileName.replace(/\.pdf$/i, '');

    console.log('[v0] Saving PDF with processing status:', { pdfId, title });
    await db.savePDF({
      id: pdfId,
      title,
      fileName,
      pageCount: 0,
      dateAdded: new Date(),
      status: 'processing',
    });

    console.log('[v0] PDF saved, starting background processing');
    // Process PDF in background
    processInBackground(file, pdfId, title);

    return NextResponse.json({
      pdfId,
      status: 'processing',
    });
  } catch (error) {
    console.error('[v0] PDF processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}

async function processInBackground(file: File, pdfId: string, title: string) {
  try {
    console.log('[v0] Background processing starting for:', pdfId);
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[v0] Buffer created, size:', buffer.length);
    // Extract content from PDF
    const content = await extractPDFContent(buffer);

    console.log('[v0] PDF extracted:', { pageCount: content.pageCount, chapters: content.chapters.length });
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

    console.log('[v0] PDF saved successfully:', pdfId);
  } catch (error) {
    console.error('[v0] PDF background processing error:', error);
    try {
      await db.updatePDFStatus(pdfId, 'error');
    } catch (updateError) {
      console.error('[v0] Error updating PDF status:', updateError);
    }
  }
}
