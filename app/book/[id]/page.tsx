'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PDF, Chapter, Annotation } from '@/lib/db';
import { BookHeader } from '@/components/book-header';
import { ChapterNav } from '@/components/chapter-nav';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { AITutorPanel } from '@/components/ai-tutor-panel';
import { LeftMargin } from '@/components/left-margin';
import { AlertCircle, BookOpen } from 'lucide-react';

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const pdfId = params.id as string;
  const contentRef = useRef<HTMLDivElement>(null);

  const [pdf, setPdf] = useState<PDF | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadPDF();
  }, [pdfId]);

  useEffect(() => {
    if (selectedChapter === null && pdf?.chapters && pdf.chapters.length > 0) {
      setSelectedChapter(pdf.chapters[0]);
    }
  }, [pdf]);

  useEffect(() => {
    loadAnnotations();
  }, [pdfId]);

  const loadPDF = async () => {
    try {
      const response = await fetch(`/api/pdf/${pdfId}`);
      if (response.ok) {
        const data: PDF = await response.json();
        setPdf(data);
        setLoadError(data.status === 'error' ? 'This book failed to process.' : null);
      } else if (response.status === 404) {
        setLoadError(null);
      } else {
        setLoadError('Unable to load this book.');
      }
    } catch (error) {
      console.error('Failed to load PDF:', error);
      setLoadError('Unable to load this book.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!pdf || pdf.status === 'processing') {
        loadPDF();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [pdfId, pdf?.status]);

  const loadAnnotations = async () => {
    try {
      const response = await fetch(`/api/annotations/${pdfId}`);
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const handleAddAnnotation = async (
    paragraphIndex: number,
    type: 'highlight' | 'annotation',
    text: string
  ) => {
    try {
      const response = await fetch(`/api/annotations/${pdfId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraphIndex, type, text }),
      });

      if (response.ok) {
        const annotation = await response.json();
        setAnnotations([...annotations, annotation]);
      }
    } catch (error) {
      console.error('Failed to save annotation:', error);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await fetch(`/api/annotations/${pdfId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotationId }),
      });

      setAnnotations(annotations.filter((a) => a.id !== annotationId));
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  const stillLoading = isLoading || !pdf || pdf.status === 'processing';

  if (stillLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-indigo-100 rounded-full blur-lg animate-pulse" />
              <div className="absolute inset-0 animate-spin border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">
              {!pdf ? 'Loading book...' : 'Processing chapters...'}
            </p>
            <p className="text-sm text-gray-600">This will only take a moment</p>
          </div>
        </div>
      </main>
    );
  }

  if (loadError || pdf?.status === 'error') {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">Book processing failed</p>
            <p className="text-sm text-gray-600">
              {loadError || 'The AI conversion did not complete successfully.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </main>
    );
  }

  if (!pdf.chapters || pdf.chapters.length === 0) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">No readable content</p>
            <p className="text-sm text-gray-600">
              This PDF doesn&apos;t contain extractable text.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </main>
    );
  }

  const currentChapterIndex = selectedChapter
    ? pdf.chapters.findIndex((c) => c.id === selectedChapter.id)
    : 0;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <BookHeader
        title={pdf.title}
        pageCount={pdf.pageCount}
        currentChapterIndex={currentChapterIndex}
        totalChapters={pdf.chapters.length}
      />

      {/* Main Reading Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Margin */}
        <LeftMargin
          selectedParagraphIndex={selectedParagraphIndex}
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          contentRef={contentRef}
        />

        {/* Sidebar - 20% width */}
        <aside className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
          <div className="p-5 sticky top-0 bg-white border-b border-gray-200 z-20">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
              Contents
            </h2>
          </div>
          <nav className="p-4">
            <ChapterNav
              chapters={pdf.chapters}
              onSelectChapter={(chapter) => {
                setSelectedChapter(chapter);
              }}
              isCollapsed={false}
            />
          </nav>
        </aside>

        {/* Main Content - 80% width */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-white to-gray-50">
          <article
            ref={contentRef}
            className="max-w-4xl mx-auto px-12 py-16 prose-container"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'P') {
                const paragraphs = contentRef.current?.querySelectorAll('p') || [];
                const index = Array.from(paragraphs).indexOf(target);
                setSelectedParagraphIndex(index);
              }
            }}
          >
            {selectedChapter && (
              <>
                {/* Chapter Header */}
                <header className="mb-12 pb-10 border-b-2 border-gray-200">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 font-bold text-indigo-600">
                      {currentChapterIndex + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                        Chapter {currentChapterIndex + 1}
                      </p>
                      <p className="text-xs text-gray-600">
                        of {pdf.chapters.length}
                      </p>
                    </div>
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                    {selectedChapter.title}
                  </h1>
                </header>

                {/* Content */}
                <div className="space-y-6 leading-relaxed">
                  <MarkdownRenderer content={selectedChapter.content} />
                </div>

                {/* Bottom spacing */}
                <div className="h-32" />
              </>
            )}
          </article>
        </div>
      </div>

      {/* AI Tutor Panel - Right margin */}
      <AITutorPanel pdfId={pdfId} pdfTitle={pdf.title} />
    </main>
  );
}

