import { NextRequest, NextResponse } from 'next/server';
import { db, type PDF } from '@/lib/db';

type ExportedBook = {
  type?: string;
  version?: number;
  exportedAt?: string;
  book?: PDF;
};

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const book = normalizeImportedBook(payload);

    if (!book) {
      return NextResponse.json(
        { error: 'Invalid PaperDrive JSON. Expected an exported book with chapters.' },
        { status: 400 }
      );
    }

    await db.savePDF(book);

    return NextResponse.json({ pdfId: book.id, book });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeImportedBook(payload: unknown): PDF | null {
  if (!payload || typeof payload !== 'object') return null;

  const wrapped = payload as ExportedBook;
  const candidate = wrapped.book && typeof wrapped.book === 'object' ? wrapped.book : payload as PDF;

  if (!candidate.title || !Array.isArray(candidate.chapters) || candidate.chapters.length === 0) {
    return null;
  }

  return {
    ...candidate,
    id: crypto.randomUUID(),
    fileName: candidate.fileName || `${candidate.title}.json`,
    pageCount: Number(candidate.pageCount) || 1,
    dateAdded: new Date().toISOString(),
    status: 'complete',
    chapters: candidate.chapters,
    content: candidate.content || candidate.chapters.map((chapter) => chapter.content).join('\n\n'),
  };
}
