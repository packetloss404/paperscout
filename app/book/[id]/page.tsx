'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PDF, Chapter, Annotation } from '@/lib/db';
import { ChapterNav } from '@/components/chapter-nav';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { MarginAnnotations } from '@/components/margin-annotations';
import { ChatButton } from '@/components/chat-button';
import { ArrowLeft, Menu, X, BookOpen } from 'lucide-react';

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

  const loadPDF = async (attempt = 0) => {
    try {
      const response = await fetch(`/api/pdf/${pdfId}`);
      if (response.ok) {
        const data: PDF = await response.json();
        setPdf(data);
        if (data.status !== 'complete' && attempt < 30) {
          // Poll until complete, backing off slightly
          setTimeout(() => loadPDF(attempt + 1), 600);
          return;
        }
      } else if (response.status === 404 && attempt < 30) {
        // Not saved yet — keep polling
        setTimeout(() => loadPDF(attempt + 1), 600);
        return;
      }
    } catch (error) {
      console.error('Failed to load PDF:', error);
      if (attempt < 30) {
        setTimeout(() => loadPDF(attempt + 1), 600);
        return;
      }
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

  const stillLoading = isLoading || !pdf || pdf.status !== 'complete';

  if (stillLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
              <div className="absolute inset-0 animate-spin border-3 border-primary border-t-transparent rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">
              {!pdf ? 'Loading book...' : 'Finalising chapters...'}
            </p>
            <p className="text-sm text-muted-foreground">This only takes a moment</p>
          </div>
        </div>
      </main>
    );
  }

  if (!pdf.chapters || pdf.chapters.length === 0) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">No readable content</p>
            <p className="text-sm text-muted-foreground">
              This PDF doesn&apos;t contain extractable text
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all hover:shadow-lg"
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground hover:shadow-sm"
              title="Back to library"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
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
            className="p-2.5 hover:bg-muted rounded-lg transition-all lg:hidden text-muted-foreground hover:text-foreground"
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
          } lg:block w-full lg:w-72 border-r border-border bg-card/50 overflow-y-auto flex-shrink-0`}
        >
          <div className="p-6 sticky top-0 bg-card/50 backdrop-blur-sm border-b border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Chapters
            </h2>
          </div>
          <nav className="p-4">
            <ChapterNav
              chapters={pdf.chapters}
              onSelectChapter={(chapter) => {
                setSelectedChapter(chapter);
                setIsSidebarOpen(false);
              }}
              isCollapsed={false}
            />
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/2">
          <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            {selectedChapter && (
              <>
                <header className="mb-10">
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance leading-tight">
                    {selectedChapter.title}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span>Chapter {pdf.chapters.indexOf(selectedChapter) + 1} of {pdf.chapters.length}</span>
                  </div>
                </header>

                <div
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'P') {
                      const paragraphs = document.querySelectorAll('article p');
                      const index = Array.from(paragraphs).indexOf(target);
                      setSelectedParagraphIndex(index);
                    }
                  }}
                  className="prose-container"
                >
                  <MarkdownRenderer content={selectedChapter.content} />
                </div>

                {/* Annotations Section */}
                {annotations.length > 0 && (
                  <section className="mt-16 pt-10 border-t border-border/50">
                    <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        ✓
                      </span>
                      Notes & Highlights
                    </h2>
                    <div className="space-y-4">
                      {annotations
                        .filter((a) => a.type === 'annotation')
                        .map((annotation) => (
                          <div
                            key={annotation.id}
                            className="group bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all"
                          >
                            <p className="text-sm text-foreground leading-relaxed">
                              {annotation.text}
                            </p>
                            <button
                              onClick={() =>
                                handleDeleteAnnotation(annotation.id)
                              }
                              className="mt-3 text-xs font-medium text-destructive/70 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Remove note
                            </button>
                          </div>
                        ))}
                    </div>
                  </section>
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
