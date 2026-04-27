'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PDF, Chapter, Annotation } from '@/lib/db';
import { ChapterNav } from '@/components/chapter-nav';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { MarginAnnotations } from '@/components/margin-annotations';
import { ChatButton } from '@/components/chat-button';
import { ArrowLeft, Menu, X } from 'lucide-react';

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const pdfId = params.id as string;

  const [pdf, setPdf] = useState<PDF | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null);

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
        if (data.status !== 'complete') {
          setTimeout(loadPDF, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to load PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleAddAnnotation = async (text: string, type: 'highlight' | 'annotation') => {
    try {
      const response = await fetch(`/api/annotations/${pdfId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraphIndex: selectedParagraphIndex || 0,
          type,
          text,
        }),
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!pdf || pdf.status !== 'complete' || !pdf.chapters) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">PDF not ready</p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-primary-foreground rounded px-4 py-2 font-medium hover:bg-primary/90"
          >
            Back to Library
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-lg font-semibold text-foreground truncate">
                {pdf.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                {pdf.pageCount} pages
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-muted rounded transition-colors lg:hidden"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-64 border-r border-border bg-card overflow-y-auto flex-shrink-0`}
        >
          <div className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Chapters
            </h2>
            <ChapterNav
              chapters={pdf.chapters}
              onSelectChapter={(chapter) => {
                setSelectedChapter(chapter);
                setIsSidebarOpen(false);
              }}
              isCollapsed={false}
            />
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {selectedChapter && (
              <>
                <h1 className="text-3xl font-bold text-foreground mb-6 text-balance">
                  {selectedChapter.title}
                </h1>

                <div
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'P') {
                      const paragraphs = document.querySelectorAll('article p');
                      const index = Array.from(paragraphs).indexOf(target);
                      setSelectedParagraphIndex(index);
                    }
                  }}
                >
                  <MarkdownRenderer content={selectedChapter.content} />
                </div>

                {/* Annotations Section */}
                {annotations.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-border">
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Notes & Highlights
                    </h2>
                    <div className="space-y-4">
                      {annotations
                        .filter((a) => a.type === 'annotation')
                        .map((annotation) => (
                          <div
                            key={annotation.id}
                            className="bg-muted/30 rounded p-4 border border-border"
                          >
                            <p className="text-sm text-foreground">
                              {annotation.text}
                            </p>
                            <button
                              onClick={() =>
                                handleDeleteAnnotation(annotation.id)
                              }
                              className="mt-2 text-xs text-destructive hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </article>
        </div>
      </div>

      {/* Chat Button */}
      <ChatButton
        pdfId={pdfId}
        onOpen={() => {
          console.log('Chat opened for:', pdfId);
        }}
      />
    </main>
  );
}
