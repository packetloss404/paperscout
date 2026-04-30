import { type Annotation, type PDF } from '@/lib/db';

const BOOKS_KEY = 'paperscout.books.v1';
const LEGACY_BOOKS_KEY = 'paperdrive.books.v1';
const ANNOTATIONS_PREFIX = 'paperscout.annotations.v1.';
const LEGACY_ANNOTATIONS_PREFIX = 'paperdrive.annotations.v1.';

export function loadLocalBooks(): PDF[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BOOKS_KEY) || window.localStorage.getItem(LEGACY_BOOKS_KEY);
    const books = raw ? (JSON.parse(raw) as PDF[]) : [];
    return books.sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  } catch {
    return [];
  }
}

export function saveLocalBooks(books: PDF[]) {
  window.localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export function getLocalBook(id: string): PDF | null {
  return loadLocalBooks().find((book) => book.id === id) || null;
}

export function upsertLocalBook(book: PDF): PDF[] {
  const books = loadLocalBooks();
  const next = [book, ...books.filter((item) => item.id !== book.id)];
  saveLocalBooks(next);
  return next;
}

export function deleteLocalBook(id: string): PDF[] {
  const next = loadLocalBooks().filter((book) => book.id !== id);
  saveLocalBooks(next);
  window.localStorage.removeItem(`${ANNOTATIONS_PREFIX}${id}`);
  window.localStorage.removeItem(`${LEGACY_ANNOTATIONS_PREFIX}${id}`);
  return next;
}

export function loadLocalAnnotations(pdfId: string): Annotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${ANNOTATIONS_PREFIX}${pdfId}`) || window.localStorage.getItem(`${LEGACY_ANNOTATIONS_PREFIX}${pdfId}`);
    return raw ? (JSON.parse(raw) as Annotation[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalAnnotations(pdfId: string, annotations: Annotation[]) {
  window.localStorage.setItem(`${ANNOTATIONS_PREFIX}${pdfId}`, JSON.stringify(annotations));
}

export function normalizeImportedBook(payload: unknown): PDF | null {
  if (!payload || typeof payload !== 'object') return null;

  const wrapped = payload as { book?: PDF };
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
