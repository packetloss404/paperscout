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

    // Clean and format the extracted text
    const cleanText = extractedText
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\. /g, '.\n\n')  // Add paragraph breaks after sentences
      .replace(/\? /g, '?\n\n')
      .replace(/! /g, '!\n\n')
      .trim();

    // Split into chunks of roughly equal size for chapters
    const words = cleanText.split(' ');
    const wordsPerChapter = Math.ceil(words.length / 10);
    const chapters: { id: string; title: string; content: string }[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerChapter) {
      const chapterWords = words.slice(i, i + wordsPerChapter);
      const content = chapterWords.join(' ');
      const chapterNum = chapters.length + 1;
      
      // Create a clean title from first sentence or first few words
      const firstSentence = content.split(/[.!?]/)[0].trim();
      const title = firstSentence.length > 50 
        ? `Chapter ${chapterNum}` 
        : firstSentence || `Chapter ${chapterNum}`;
      
      chapters.push({
        id: `ch-${chapterNum}`,
        title,
        content,
      });
    }

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
