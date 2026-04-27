import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfId, title, fileName, content, chapters, pageCount } = body;

    if (!pdfId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save processed PDF directly
    await db.savePDF({
      id: pdfId,
      title,
      fileName: fileName || title,
      pageCount: pageCount || 0,
      dateAdded: new Date(),
      content: content || '',
      chapters: chapters || [],
      status: 'complete',
    });

    return NextResponse.json({
      pdfId,
      status: 'complete',
    });
  } catch (error) {
    console.error('[v0] PDF processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}
