import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Parse into chapters
    const chapters = extractedText
      .split('\n\n')
      .slice(0, 20)
      .map((section: string, idx: number) => ({
        id: `ch-${idx}`,
        title: section.split('\n')[0].slice(0, 60) || `Section ${idx + 1}`,
        content: section,
      }));

    // Save to database
    await db.savePDF({
      id: pdfId,
      title: fileName.replace(/\.pdf$/i, ''),
      fileName,
      pageCount: pageCount || 1,
      dateAdded: new Date(),
      content: extractedText,
      chapters,
      status: 'complete',
    });

    return NextResponse.json({ pdfId, status: 'complete' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
