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
import { AlertCircle, BookOpen, BrainCircuit, ExternalLink, Highlighter, Link2, Network, ScrollText, Search, ShieldAlert, Target } from 'lucide-react';

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
    setLoadError(data ? null : 'This report is not in your browser library. Import its PaperScout JSON file from the home page.');
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
              <div className="absolute inset-0 bg-emerald-100 rounded-full blur-lg animate-pulse" />
              <div className="absolute inset-0 animate-spin border-4 border-emerald-200 border-t-emerald-700 rounded-full" />
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
            <p className="text-lg font-semibold text-gray-900">Book unavailable</p>
            <p className="text-sm text-gray-600">
              {loadError || 'The AI conversion did not complete successfully.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-800 transition-colors"
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl">
            <BookOpen className="w-8 h-8 text-emerald-700" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">No readable content</p>
            <p className="text-sm text-gray-600">
              This PDF doesn&apos;t contain extractable text.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-800 transition-colors"
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
  const intelligence = pdf.intelligence;
  const intelligenceSignals = [
    { label: 'Claims', active: Boolean(intelligence?.keyClaims?.length) || chapterContent.includes('What This Section Says'), icon: Target },
    { label: 'Caveats', active: Boolean(intelligence?.caveats?.length) || chapterContent.includes('Caveats'), icon: ShieldAlert },
    { label: 'Entities', active: Boolean(intelligence?.entities?.length) || chapterContent.includes('Key Entities'), icon: Network },
    { label: 'Research Trails', active: Boolean(intelligence?.researchTrails?.length) || chapterContent.includes('Follow-Up Threads'), icon: Search },
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(251,191,36,0.25),transparent_28%),radial-gradient(circle_at_92%_18%,rgba(16,185,129,0.18),transparent_32%),linear-gradient(120deg,rgba(255,255,255,0.45),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#2b2118_1px,transparent_1px),linear-gradient(90deg,#2b2118_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:pl-6 lg:pr-[360px] xl:grid-cols-[280px_minmax(0,1fr)_340px] xl:pr-6">
          <aside className="order-2 rounded-[1.75rem] border border-stone-900/10 bg-white/70 p-4 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl xl:order-1 xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="mb-4 rounded-2xl bg-[#1d160f] p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">Report Map</p>
              <h2 className="mt-2 text-lg font-semibold leading-tight">{pdf.chapters.length} analyzed sections</h2>
              <p className="mt-2 text-xs leading-relaxed text-stone-300">Navigate the AI-generated intelligence structure.</p>
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
                        <SparklesBadge /> Research Brief
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
                      Generated as an analyst brief with key claims, caveats, entities, and follow-up research trails.
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

          <aside className="order-3 hidden space-y-4 lg:fixed lg:bottom-6 lg:right-6 lg:top-24 lg:z-20 lg:block lg:w-[300px] lg:overflow-y-auto lg:pr-1 xl:w-[320px]">
            {intelligence && (
              <div className="rounded-[1.75rem] border border-stone-900/10 bg-[#1d160f] p-5 text-white shadow-[0_20px_80px_rgba(54,38,22,0.14)]">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-200/15 p-3 text-amber-200">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Executive Brief</p>
                    <h3 className="font-semibold">What this is saying</h3>
                  </div>
                </div>
                <div className="mt-4 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100">
                  {intelligence.category}
                </div>
                <p className="mt-4 text-sm leading-6 text-stone-300">{intelligence.executiveBrief}</p>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">Why it matters</p>
                  <p className="mt-2 text-sm leading-6 text-stone-200">{intelligence.whyItMatters}</p>
                </div>
              </div>
            )}

            <div className="rounded-[1.75rem] border border-stone-900/10 bg-white/75 p-5 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">AI Artifacts</p>
                  <h3 className="font-semibold text-stone-950">Research Signals</h3>
                </div>
              </div>
              <div className="space-y-2">
                {intelligenceSignals.map((signal) => {
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
              <p className="mt-3 text-sm leading-6 text-stone-300">Click any paragraph to attach highlights or notes. Export the JSON when you want to preserve or share the analysis.</p>
            </div>

            {intelligence?.keyClaims?.length ? (
              <div className="rounded-[1.75rem] border border-stone-900/10 bg-white/75 p-5 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-emerald-700" />
                  <h3 className="font-semibold text-stone-950">Key Claims</h3>
                </div>
                <div className="mt-4 space-y-2">
                  {intelligence.keyClaims.slice(0, 4).map((claim, index) => (
                    <div key={index} className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-3 text-sm leading-6 text-stone-700">
                      {claim}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {intelligence?.caveats?.length ? (
              <div className="rounded-[1.75rem] border border-orange-200 bg-orange-50/90 p-5 shadow-[0_20px_80px_rgba(154,52,18,0.10)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-orange-700" />
                  <h3 className="font-semibold text-stone-950">Caveats</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {intelligence.caveats.slice(0, 4).map((caveat, index) => (
                    <li key={index} className="text-sm leading-6 text-stone-700">{caveat}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {intelligence?.citationSignals?.length ? (
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/90 p-5 shadow-[0_20px_80px_rgba(6,95,70,0.10)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <ScrollText className="h-5 w-5 text-emerald-800" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Footnotes & Citations</p>
                    <h3 className="font-semibold text-stone-950">Source Leads</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {intelligence.citationSignals.slice(0, 6).map((signal, index) => (
                    <div key={`${signal.label}-${index}`} className="rounded-2xl border border-emerald-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold leading-5 text-stone-950">{signal.label}</h4>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">{signal.type}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-stone-600">{signal.reason}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {signal.links.slice(0, 3).map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100"
                          >
                            {link.label}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-[1.75rem] border border-stone-900/10 bg-white/75 p-5 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-emerald-800" />
                <h3 className="font-semibold text-stone-950">Research Trails</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">Use the links below to leave the PDF and investigate related work, adjacent concepts, and evidence gaps.</p>
              <div className="mt-4 space-y-4">
                {(intelligence?.researchTrails || []).slice(0, 5).map((trail, index) => (
                  <div key={`${trail.title}-${index}`} className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-3">
                    <h4 className="text-sm font-bold text-stone-950">{trail.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-stone-600">{trail.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {trail.links.slice(0, 4).map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50"
                        >
                          {link.label}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
                {!intelligence?.researchTrails?.length && (
                  <p className="text-sm leading-6 text-stone-500">Reprocess this PDF to generate research trails.</p>
                )}
              </div>
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

