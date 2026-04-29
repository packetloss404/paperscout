'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PDF, Chapter, Annotation } from '@/lib/db';
import { getLocalBook, loadLocalAnnotations, saveLocalAnnotations } from '@/lib/local-library';
import { BookHeader } from '@/components/book-header';
import { ChapterNav } from '@/components/chapter-nav';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { AITutorPanel } from '@/components/ai-tutor-panel';
import { LeftMargin } from '@/components/left-margin';
import { AlertCircle, BookOpen, BrainCircuit, FlaskConical, GraduationCap, Highlighter, Lightbulb, Network, ScrollText } from 'lucide-react';

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
    const data = getLocalBook(pdfId);
    setPdf(data);
    setLoadError(data ? null : 'This book is not in your browser library. Import its PaperDrive JSON file from the home page.');
    setIsLoading(false);
  };

  const loadAnnotations = async () => {
    setAnnotations(loadLocalAnnotations(pdfId));
  };

  const handleAddAnnotation = async (
    paragraphIndex: number,
    type: 'highlight' | 'annotation',
    text: string
  ) => {
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      pdfId,
      paragraphIndex,
      type,
      text,
      createdAt: new Date().toISOString(),
    };
    const next = [...annotations, annotation];
    setAnnotations(next);
    saveLocalAnnotations(pdfId, next);
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    const next = annotations.filter((a) => a.id !== annotationId);
    setAnnotations(next);
    saveLocalAnnotations(pdfId, next);
  };

  const stillLoading = isLoading;

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
  const chapterContent = selectedChapter?.content || '';
  const studySignals = [
    { label: 'Big Idea', active: chapterContent.includes('[Big Idea]'), icon: Lightbulb },
    { label: 'Concept Map', active: chapterContent.includes('Concept Map'), icon: Network },
    { label: 'Tutor Lens', active: chapterContent.includes('[Tutor Lens]'), icon: BrainCircuit },
    { label: 'Quiz', active: chapterContent.includes('Check Your Understanding'), icon: GraduationCap },
  ];

  return (
    <main className="min-h-screen bg-[#f6efe3] text-stone-950">
      <BookHeader
        title={pdf.title}
        pageCount={pdf.pageCount}
        currentChapterIndex={currentChapterIndex}
        totalChapters={pdf.chapters.length}
      />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(251,191,36,0.25),transparent_28%),radial-gradient(circle_at_92%_18%,rgba(79,70,229,0.16),transparent_32%),linear-gradient(120deg,rgba(255,255,255,0.45),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#2b2118_1px,transparent_1px),linear-gradient(90deg,#2b2118_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="order-2 rounded-[1.75rem] border border-stone-900/10 bg-white/70 p-4 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl xl:order-1 xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="mb-4 rounded-2xl bg-[#1d160f] p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">Study Map</p>
              <h2 className="mt-2 text-lg font-semibold leading-tight">{pdf.chapters.length} teachable chapters</h2>
              <p className="mt-2 text-xs leading-relaxed text-stone-300">Navigate the AI-generated textbook structure.</p>
            </div>
            <ChapterNav
              chapters={pdf.chapters}
              onSelectChapter={(chapter) => {
                setSelectedChapter(chapter);
              }}
              isCollapsed={false}
            />
          </aside>

          <section className="order-1 overflow-hidden rounded-[2rem] border border-stone-900/10 bg-[#fffaf1] shadow-[0_30px_120px_rgba(54,38,22,0.16)] xl:order-2">
            {selectedChapter && (
              <>
                <div className="relative overflow-hidden border-b border-stone-200 bg-[#21170f] px-8 py-10 text-white md:px-12">
                  <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
                  <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-200/60 to-transparent" />
                  <div className="relative max-w-4xl">
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-100">
                        <SparklesBadge /> Study Edition
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-stone-200">
                        Chapter {currentChapterIndex + 1} of {pdf.chapters.length}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-stone-200">
                        {annotations.length} margin notes
                      </span>
                    </div>
                    <h1 className="max-w-3xl text-balance text-4xl font-black leading-[0.98] tracking-tight md:text-6xl">
                      {selectedChapter.title}
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 md:text-lg">
                      Generated as an interactive lesson with learning objectives, concept maps, tutor callouts, and self-check questions.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-0 md:grid-cols-[5rem_minmax(0,1fr)]">
                  <LeftMargin
                    selectedParagraphIndex={selectedParagraphIndex}
                    annotations={annotations}
                    onAddAnnotation={handleAddAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    contentRef={contentRef}
                  />
                  <article
                    ref={contentRef}
                    className="min-w-0 px-5 py-10 md:px-12 md:py-14"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'P') {
                        const paragraphs = contentRef.current?.querySelectorAll('p') || [];
                        const index = Array.from(paragraphs).indexOf(target);
                        setSelectedParagraphIndex(index);
                      }
                    }}
                  >
                    <MarkdownRenderer content={selectedChapter.content} />
                    <div className="h-24" />
                  </article>
                </div>
              </>
            )}
          </section>

          <aside className="order-3 hidden space-y-4 lg:block xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="rounded-[1.75rem] border border-stone-900/10 bg-white/75 p-5 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">AI Artifacts</p>
                  <h3 className="font-semibold text-stone-950">Study Toolkit</h3>
                </div>
              </div>
              <div className="space-y-2">
                {studySignals.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <div key={signal.label} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-[#fffaf1] px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-stone-600" />
                        <span className="text-sm font-medium text-stone-800">{signal.label}</span>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${signal.active ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'bg-stone-300'}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-stone-900/10 bg-[#1d160f] p-5 text-white shadow-[0_20px_80px_rgba(54,38,22,0.14)]">
              <div className="flex items-center gap-3">
                <Highlighter className="h-5 w-5 text-amber-200" />
                <h3 className="font-semibold">Margin Mode</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-300">Click any paragraph to attach highlights or notes. Export the book JSON when you want to carry the study edition elsewhere.</p>
            </div>

            <div className="rounded-[1.75rem] border border-stone-900/10 bg-white/75 p-5 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <FlaskConical className="h-5 w-5 text-indigo-700" />
                <h3 className="font-semibold text-stone-950">Reader Labs</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">Ask the AI tutor to translate equations, critique assumptions, or turn the current chapter into flashcards.</p>
            </div>
          </aside>
        </div>
      </div>

      <AITutorPanel pdfId={pdfId} pdfTitle={pdf.title} pdfContent={pdf.content || ''} />
    </main>
  );
}

function SparklesBadge() {
  return <ScrollText className="h-3 w-3" />;
}

