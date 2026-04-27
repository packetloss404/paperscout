import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
      chapters: [
        {
          id: '1',
          title: 'Loading...',
          content: 'PDF is being processed. Please wait.',
        }
      ]
    });

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
