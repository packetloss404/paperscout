'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { type Annotation, type Chapter, type ClaimCard, type PDF, type ResearchLink, type ScoutBoardItem, type SkepticSignal } from '@/lib/db';
import { getLocalBook, loadLocalAnnotations, saveLocalAnnotations, upsertLocalBook } from '@/lib/local-library';
import { BookHeader } from '@/components/book-header';
import { ChapterNav } from '@/components/chapter-nav';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { AITutorPanel } from '@/components/ai-tutor-panel';
import { LeftMargin } from '@/components/left-margin';
import { AlertCircle, BookOpen, BrainCircuit, CheckCircle2, ClipboardList, ExternalLink, Eye, Highlighter, Link2, Network, Plus, ScrollText, Search, ShieldAlert, Target, Trash2 } from 'lucide-react';

const SCOUT_STATUSES: ScoutBoardItem['status'][] = ['To verify', 'Interesting', 'Read next', 'Done'];

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const pdfId = params.id as string;
  const contentRef = useRef<HTMLDivElement>(null);

  const [pdf, setPdf] = useState<PDF | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [scoutBoard, setScoutBoard] = useState<ScoutBoardItem[]>([]);
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
    setScoutBoard(data?.scoutBoard || []);
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

  const saveScoutBoard = (next: ScoutBoardItem[]) => {
    setScoutBoard(next);
    if (!pdf) return;

    const updatedBook = { ...pdf, scoutBoard: next };
    setPdf(updatedBook);
    upsertLocalBook(updatedBook);
  };

  const handleAddScoutItem = (item: Omit<ScoutBoardItem, 'id' | 'createdAt' | 'status'> & { status?: ScoutBoardItem['status'] }) => {
    if (scoutBoard.some((saved) => saved.kind === item.kind && saved.title === item.title)) return;

    saveScoutBoard([
      {
        ...item,
        id: crypto.randomUUID(),
        status: item.status || 'To verify',
        createdAt: new Date().toISOString(),
      },
      ...scoutBoard,
    ]);
  };

  const handleScoutStatusChange = (id: string, status: ScoutBoardItem['status']) => {
    saveScoutBoard(scoutBoard.map((item) => item.id === id ? { ...item, status } : item));
  };

  const handleRemoveScoutItem = (id: string) => {
    saveScoutBoard(scoutBoard.filter((item) => item.id !== id));
  };

  const hasScoutItem = (kind: ScoutBoardItem['kind'], title: string) => {
    return scoutBoard.some((item) => item.kind === kind && item.title === title);
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

  if (!pdf) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">Book unavailable</p>
            <p className="text-sm text-gray-600">This report could not be loaded from your browser library.</p>
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
  const claimCards = getClaimCards(intelligence);
  const skepticSignals = intelligence?.skepticMode || [];
  const weirdFindings = intelligence?.weirdFindings || [];
  const completedScoutItems = scoutBoard.filter((item) => item.status === 'Done').length;
  const intelligenceSignals = [
    { label: 'Claim Cards', active: Boolean(claimCards.length) || chapterContent.includes('What This Section Says'), icon: Target },
    { label: 'Caveats', active: Boolean(intelligence?.caveats?.length) || chapterContent.includes('Caveats'), icon: ShieldAlert },
    { label: 'Skeptic Mode', active: Boolean(skepticSignals.length), icon: Eye },
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

      <div className="relative overflow-x-clip">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(251,191,36,0.25),transparent_28%),radial-gradient(circle_at_92%_18%,rgba(16,185,129,0.18),transparent_32%),linear-gradient(120deg,rgba(255,255,255,0.45),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#2b2118_1px,transparent_1px),linear-gradient(90deg,#2b2118_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative mx-auto grid max-w-[1560px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start lg:gap-0 lg:px-6 xl:grid-cols-[260px_minmax(0,1fr)_330px] xl:gap-6">
          <aside className="order-2 rounded-[1.75rem] border border-stone-900/10 bg-white/70 p-4 shadow-[0_20px_80px_rgba(54,38,22,0.10)] backdrop-blur-xl lg:order-3 lg:col-span-2 xl:order-1 xl:col-span-1 xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:overflow-y-auto">
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

          <section className="order-1 overflow-hidden rounded-[2rem] border border-stone-900/10 bg-[#fffaf1] shadow-[0_30px_120px_rgba(54,38,22,0.16)] lg:rounded-r-none lg:border-r-0 xl:order-2">
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
                  <article className="min-w-0 px-5 py-10 md:px-12 md:py-14">
                    {intelligence ? (
                      <div className="mb-10 overflow-hidden rounded-[1.75rem] border border-emerald-900/15 bg-[#f8f2e7] shadow-[0_18px_70px_rgba(54,38,22,0.10)]">
                        <div className="relative overflow-hidden border-b border-emerald-900/10 bg-[#12372a] p-5 text-white md:p-7">
                          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
                          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/25 bg-emerald-200/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-100">
                                <ClipboardList className="h-3.5 w-3.5" /> Scout Board Starter Pack
                              </p>
                              <h2 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">Turn this report into a follow-up investigation</h2>
                              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
                                Save claims, doubts, weird findings, and source leads into a portable board that exports with this PaperScout JSON.
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">Board Progress</p>
                              <p className="mt-1 text-2xl font-black">{completedScoutItems}/{scoutBoard.length}</p>
                              <p className="text-xs text-emerald-50/70">items done</p>
                            </div>
                          </div>
                        </div>

                        {claimCards.length ? (
                          <div className="p-5 md:p-7">
                            <div className="mb-4 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800">Claim Cards</p>
                                <h3 className="text-lg font-bold text-stone-950">Claims with evidence, caveats, and verification links</h3>
                              </div>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-3">
                              {claimCards.slice(0, 3).map((card, index) => {
                                const saved = hasScoutItem('claim', card.claim);
                                return (
                                  <div key={`${card.claim}-${index}`} className="flex min-h-full flex-col rounded-3xl border border-stone-900/10 bg-[#fffaf1] p-4 shadow-sm">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${supportLevelClass(card.supportLevel)}`}>
                                        {card.supportLevel}
                                      </span>
                                      <span className="text-xs font-bold text-stone-400">#{index + 1}</span>
                                    </div>
                                    <h4 className="text-base font-black leading-6 text-stone-950">{card.claim}</h4>
                                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Evidence</p>
                                    <p className="mt-1 text-sm leading-6 text-stone-700">{card.evidence}</p>
                                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Caveat</p>
                                    <p className="mt-1 text-sm leading-6 text-stone-700">{card.caveat}</p>
                                    <div className="mt-4 flex flex-wrap gap-1.5">
                                      {card.links.slice(0, 3).map((link) => (
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
                                    <button
                                      type="button"
                                      onClick={() => handleAddScoutItem({
                                        kind: 'claim',
                                        title: card.claim,
                                        detail: `${card.evidence} Caveat: ${card.caveat}`,
                                        links: card.links,
                                      })}
                                      disabled={saved}
                                      className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900 transition-colors hover:border-emerald-400 hover:bg-emerald-100 disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-500"
                                    >
                                      {saved ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                      {saved ? 'Saved' : 'Add to Scout Board'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <div className="grid gap-4 border-t border-emerald-900/10 p-5 md:grid-cols-2 md:p-7">
                          <div className="rounded-3xl border border-orange-200 bg-orange-50/80 p-4">
                            <div className="flex items-center gap-3">
                              <Eye className="h-5 w-5 text-orange-800" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-800">Skeptic Mode</p>
                                <h3 className="font-bold text-stone-950">What not to trust yet</h3>
                              </div>
                            </div>
                            <div className="mt-4 space-y-3">
                              {skepticSignals.length ? skepticSignals.slice(0, 4).map((signal, index) => {
                                const saved = hasScoutItem('skeptic', signal.label);
                                return (
                                  <div key={`${signal.label}-${index}`} className="rounded-2xl border border-orange-200 bg-white p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">{skepticLabel(signal.type)}</p>
                                        <h4 className="mt-1 text-sm font-bold leading-5 text-stone-950">{signal.label}</h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddScoutItem({
                                          kind: 'skeptic',
                                          title: signal.label,
                                          detail: signal.reason,
                                          links: signal.links,
                                        })}
                                        disabled={saved}
                                        className="rounded-full border border-orange-200 bg-orange-50 p-1.5 text-orange-800 hover:bg-orange-100 disabled:bg-stone-100 disabled:text-stone-400"
                                        title={saved ? 'Saved to Scout Board' : 'Add to Scout Board'}
                                      >
                                        {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                      </button>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-stone-700">{signal.reason}</p>
                                  </div>
                                );
                              }) : (
                                <p className="rounded-2xl border border-orange-200 bg-white p-3 text-sm leading-6 text-stone-600">Reprocess this PDF to generate Skeptic Mode checks.</p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-4">
                            <div className="flex items-center gap-3">
                              <Search className="h-5 w-5 text-emerald-800" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800">Show Me The Weird Stuff</p>
                                <h3 className="font-bold text-stone-950">Buried rabbit holes</h3>
                              </div>
                            </div>
                            <div className="mt-4 space-y-3">
                              {weirdFindings.length ? weirdFindings.slice(0, 4).map((finding, index) => {
                                const saved = hasScoutItem('weird', finding.label);
                                return (
                                  <div key={`${finding.label}-${index}`} className="rounded-2xl border border-emerald-200 bg-white p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">{finding.type}</p>
                                        <h4 className="mt-1 text-sm font-bold leading-5 text-stone-950">{finding.label}</h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddScoutItem({
                                          kind: 'weird',
                                          title: finding.label,
                                          detail: finding.reason,
                                          status: 'Interesting',
                                          links: finding.links,
                                        })}
                                        disabled={saved}
                                        className="rounded-full border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100 disabled:bg-stone-100 disabled:text-stone-400"
                                        title={saved ? 'Saved to Scout Board' : 'Add to Scout Board'}
                                      >
                                        {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                      </button>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-stone-700">{finding.reason}</p>
                                  </div>
                                );
                              }) : (
                                <p className="rounded-2xl border border-emerald-200 bg-white p-3 text-sm leading-6 text-stone-600">Reprocess this PDF to surface surprising follow-up threads.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {scoutBoard.length ? (
                          <div className="border-t border-emerald-900/10 p-5 lg:hidden">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800">Current Scout Board</p>
                                <h3 className="font-bold text-stone-950">Saved follow-ups</h3>
                              </div>
                              <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-black text-emerald-900">{scoutBoard.length}</span>
                            </div>
                            <div className="space-y-3">
                              {scoutBoard.slice(0, 4).map((item) => (
                                <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">{item.kind}</p>
                                      <h4 className="mt-1 text-sm font-bold leading-5 text-stone-950">{item.title}</h4>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveScoutItem(item.id)}
                                      className="rounded-full p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                                      title="Remove from Scout Board"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <select
                                    value={item.status}
                                    onChange={(event) => handleScoutStatusChange(item.id, event.target.value as ScoutBoardItem['status'])}
                                    className={`mt-3 w-full rounded-full border px-2.5 py-1 text-xs font-bold outline-none ${statusClass(item.status)}`}
                                  >
                                    {SCOUT_STATUSES.map((status) => (
                                      <option key={status} value={status}>{status}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div
                      ref={contentRef}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target instanceof HTMLParagraphElement) {
                          const paragraphs = contentRef.current?.querySelectorAll('p') || [];
                          const index = Array.from(paragraphs).indexOf(target);
                          setSelectedParagraphIndex(index);
                        }
                      }}
                    >
                      <MarkdownRenderer content={selectedChapter.content} />
                    </div>
                    <div className="h-24" />
                  </article>
                </div>
              </>
            )}
          </section>

          <aside className="order-3 hidden border border-stone-900/10 border-l-stone-300 bg-[#fffaf1]/95 shadow-[18px_30px_100px_rgba(54,38,22,0.14)] backdrop-blur-xl lg:order-2 lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)] lg:overflow-y-auto lg:rounded-r-[2rem] lg:border-l lg:p-4 xl:order-3 xl:rounded-l-none">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-stone-900/10 bg-[#fffaf1]/95 px-4 py-4 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-800">Research Margin</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-stone-950">Notes beside the paper</h2>
              <p className="mt-1 text-xs leading-5 text-stone-600">Claims, callouts, caveats, and citations that travel with the center feed.</p>
            </div>
            <div className="space-y-3">
              {intelligence && (
              <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-amber-200 border-l-amber-600 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800">Margin Note 01</p>
                    <h3 className="font-semibold text-stone-950">Executive Brief</h3>
                  </div>
                </div>
                <div className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                  {intelligence.category}
                </div>
                <p className="mt-4 text-sm leading-6 text-stone-700">{intelligence.executiveBrief}</p>
                <div className="mt-4 rounded-2xl border border-stone-200 bg-[#fffaf1] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Why it matters</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{intelligence.whyItMatters}</p>
                </div>
              </div>
              )}

            <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-emerald-200 border-l-emerald-700 bg-white/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800">Margin Board</p>
                    <h3 className="font-semibold text-stone-950">Active follow-ups</h3>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-black text-emerald-900">
                  {scoutBoard.length}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">Saved notes from the center feed. These stay with the report and export in JSON.</p>
              <div className="mt-4 space-y-3">
                {scoutBoard.length ? scoutBoard.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">{item.kind}</p>
                        <h4 className="mt-1 text-sm font-bold leading-5 text-stone-950">{item.title}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScoutItem(item.id)}
                        className="rounded-full p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove from Scout Board"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-600">{item.detail}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(event) => handleScoutStatusChange(item.id, event.target.value as ScoutBoardItem['status'])}
                        className={`min-w-0 flex-1 rounded-full border px-2.5 py-1 text-xs font-bold outline-none ${statusClass(item.status)}`}
                      >
                        {SCOUT_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      {item.links?.[0] ? (
                        <a
                          href={item.links[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100"
                          title={`Open ${item.links[0].label}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-emerald-300 bg-white/70 p-4 text-sm leading-6 text-stone-600">
                    Add Claim Cards, Skeptic checks, weird findings, or source leads to start your investigation queue.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-stone-200 border-l-stone-400 bg-white/75 p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-500">Margin Index</p>
                  <h3 className="font-semibold text-stone-950">Research layers</h3>
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

            <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-amber-200 border-l-amber-600 bg-amber-50/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Highlighter className="h-5 w-5 text-amber-800" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800">Hand Notes</p>
                  <h3 className="font-semibold text-stone-950">Paragraph annotations</h3>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-700">Click any paragraph in the paper to attach highlights or notes in the left gutter.</p>
            </div>

            {claimCards.length ? (
              <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-emerald-200 border-l-emerald-700 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-800">Callouts</p>
                    <h3 className="font-semibold text-stone-950">Claims to verify</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {claimCards.slice(0, 4).map((card, index) => {
                    const saved = hasScoutItem('claim', card.claim);
                    return (
                      <div key={`${card.claim}-${index}`} className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${supportLevelClass(card.supportLevel)}`}>{card.supportLevel}</span>
                            <h4 className="mt-2 text-sm font-bold leading-5 text-stone-950">{card.claim}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddScoutItem({
                              kind: 'claim',
                              title: card.claim,
                              detail: `${card.evidence} Caveat: ${card.caveat}`,
                              links: card.links,
                            })}
                            disabled={saved}
                            className="rounded-full border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100 disabled:bg-stone-100 disabled:text-stone-400"
                            title={saved ? 'Saved to Scout Board' : 'Add to Scout Board'}
                          >
                            {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-600">{card.evidence}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {intelligence?.caveats?.length ? (
              <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-orange-200 border-l-orange-600 bg-orange-50/85 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-orange-700" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-800">Caveat Flags</p>
                    <h3 className="font-semibold text-stone-950">Needs caution</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {intelligence.caveats.slice(0, 4).map((caveat, index) => {
                    const saved = hasScoutItem('caveat', caveat);
                    return (
                      <div key={index} className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-white p-3">
                        <p className="flex-1 text-sm leading-6 text-stone-700">{caveat}</p>
                        <button
                          type="button"
                          onClick={() => handleAddScoutItem({
                            kind: 'caveat',
                            title: caveat,
                            detail: 'Caveat flagged by PaperScout for follow-up verification.',
                          })}
                          disabled={saved}
                          className="rounded-full border border-orange-200 bg-orange-50 p-1.5 text-orange-800 hover:bg-orange-100 disabled:bg-stone-100 disabled:text-stone-400"
                          title={saved ? 'Saved to Scout Board' : 'Add to Scout Board'}
                        >
                          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {intelligence?.citationSignals?.length ? (
              <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-emerald-200 border-l-emerald-700 bg-emerald-50/75 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <ScrollText className="h-5 w-5 text-emerald-800" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Footnotes & Citations</p>
                    <h3 className="font-semibold text-stone-950">Citation leads</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {intelligence.citationSignals.slice(0, 6).map((signal, index) => {
                    const saved = hasScoutItem('citation', signal.label);
                    return (
                      <div key={`${signal.label}-${index}`} className="rounded-2xl border border-emerald-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">{signal.type}</span>
                            <h4 className="mt-2 text-sm font-bold leading-5 text-stone-950">{signal.label}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddScoutItem({
                              kind: 'citation',
                              title: signal.label,
                              detail: signal.reason,
                              status: 'Read next',
                              links: signal.links,
                            })}
                            disabled={saved}
                            className="rounded-full border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100 disabled:bg-stone-100 disabled:text-stone-400"
                            title={saved ? 'Saved to Scout Board' : 'Add to Scout Board'}
                          >
                            {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
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
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-r-[1.5rem] rounded-l-md border border-l-4 border-teal-200 border-l-teal-700 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-emerald-800" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-800">Read Next</p>
                  <h3 className="font-semibold text-stone-950">Research trails</h3>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">Follow these links when the paper raises a thread worth checking outside the PDF.</p>
              <div className="mt-4 space-y-4">
                {(intelligence?.researchTrails || []).slice(0, 5).map((trail, index) => {
                  const saved = hasScoutItem('trail', trail.title);
                  return (
                    <div key={`${trail.title}-${index}`} className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-stone-950">{trail.title}</h4>
                        <button
                          type="button"
                          onClick={() => handleAddScoutItem({
                            kind: 'trail',
                            title: trail.title,
                            detail: trail.reason,
                            status: 'Read next',
                            links: trail.links,
                          })}
                          disabled={saved}
                          className="rounded-full border border-emerald-200 bg-white p-1.5 text-emerald-800 hover:bg-emerald-50 disabled:bg-stone-100 disabled:text-stone-400"
                          title={saved ? 'Saved to Scout Board' : 'Add to Scout Board'}
                        >
                          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        </button>
                      </div>
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
                  );
                })}
                {!intelligence?.researchTrails?.length && (
                  <p className="text-sm leading-6 text-stone-500">Reprocess this PDF to generate research trails.</p>
                )}
              </div>
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

function getClaimCards(intelligence: PDF['intelligence']): ClaimCard[] {
  if (!intelligence) return [];
  if (intelligence.claimCards?.length) return intelligence.claimCards;

  return intelligence.keyClaims.slice(0, 6).map((claim, index) => ({
    claim,
    evidence: 'Flagged by PaperScout as a key claim in the generated brief.',
    caveat: intelligence.caveats[index] || 'Verify this against the original source and adjacent research.',
    supportLevel: 'Needs verification',
    query: claim,
    links: buildFallbackLinks(claim),
  }));
}

function buildFallbackLinks(query: string): ResearchLink[] {
  const encoded = encodeURIComponent(query);
  return [
    {
      label: 'Google Scholar',
      source: 'Scholar',
      url: `https://scholar.google.com/scholar?q=${encoded}`,
    },
    {
      label: 'Semantic Scholar',
      source: 'Papers',
      url: `https://www.semanticscholar.org/search?q=${encoded}&sort=relevance`,
    },
    {
      label: 'Web search',
      source: 'Broader web',
      url: `https://www.google.com/search?q=${encoded}`,
    },
  ];
}

function supportLevelClass(level: ClaimCard['supportLevel']) {
  switch (level) {
    case 'Strong':
      return 'border border-emerald-200 bg-emerald-100 text-emerald-900';
    case 'Medium':
      return 'border border-amber-200 bg-amber-100 text-amber-900';
    case 'Weak':
      return 'border border-orange-200 bg-orange-100 text-orange-900';
    default:
      return 'border border-stone-200 bg-stone-100 text-stone-700';
  }
}

function skepticLabel(type: SkepticSignal['type']) {
  switch (type) {
    case 'missingEvidence':
      return 'Missing evidence';
    case 'leap':
      return 'Suspicious leap';
    case 'dissent':
      return 'Likely dissent';
    case 'assumption':
      return 'Fragile assumption';
    default:
      return 'Needs verification';
  }
}

function statusClass(status: ScoutBoardItem['status']) {
  switch (status) {
    case 'Done':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'Read next':
      return 'border-blue-200 bg-blue-50 text-blue-900';
    case 'Interesting':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-orange-200 bg-orange-50 text-orange-900';
  }
}

