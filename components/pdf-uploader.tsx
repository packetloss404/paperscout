'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Upload } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { v4 as uuidv4 } from 'uuid';
import { type PDF } from '@/lib/db';
import { PDF_PROCESSING_LIMITS } from '@/lib/pdf-limits';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type Step = 'idle' | 'extracting' | 'uploading' | 'queued' | 'approval' | 'processing' | 'done' | 'error';

type WorkflowEvent = {
  type: string;
  message: string;
  at: string;
  progress?: number;
  chapterIndex?: number;
  chapterTotal?: number;
  chapterTitle?: string;
  chapters?: ChapterApproval[];
  error?: string;
};

type ChapterStatus = 'pending' | 'processing' | 'complete' | 'error';

type ChapterCard = {
  index: number;
  title: string;
  status: ChapterStatus;
  error?: string;
};

type ChapterApproval = {
  index: number;
  title: string;
  characters?: number;
};

type ActiveRun = {
  runId: string;
  pdfId: string;
  fileName: string;
};

const ACTIVE_RUN_KEY = 'paperscout.activeRun.v1';
const POLL_DELAY_MS = 1500;

const STEP_LABELS: Record<Step, string> = {
  idle: 'Drop a PDF to build a research brief',
  extracting: 'Reading the PDF...',
  uploading: 'Preparing the text for analysis...',
  queued: 'Starting your research brief...',
  approval: 'Check the section map to continue',
  processing: 'Mapping sections, finding claims, and checking caveats...',
  done: 'Brief ready',
  error: 'We could not finish this brief',
};

const EVENT_LABELS: Record<string, string> = {
  workflow_started: 'Brief started',
  retry_demo: 'Debug retry',
  analyzing: 'Reading structure',
  chapters_discovered: 'Sections mapped',
  awaiting_approval: 'Section map ready',
  approval_received: 'Section map accepted',
  intelligence_started: 'Finding claims',
  intelligence_completed: 'Claims and caveats ready',
  chapter_started: 'Reading section',
  chapter_completed: 'Section complete',
  chapter_failed: 'Section needs retry',
  assembling_book: 'Building brief',
  workflow_completed: 'Brief complete',
  workflow_error: 'Brief failed',
};

interface PDFUploaderProps {
  onUploaded?: (book: PDF) => void;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readActiveRun(): ActiveRun | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_RUN_KEY);
    return raw ? (JSON.parse(raw) as ActiveRun) : null;
  } catch {
    return null;
  }
}

function statusClass(status: ChapterStatus) {
  switch (status) {
    case 'complete':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'processing':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'error':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-stone-200 bg-white text-stone-600';
  }
}

function statusLabel(status: ChapterStatus) {
  switch (status) {
    case 'complete':
      return 'mapped';
    case 'processing':
      return 'reading';
    case 'error':
      return 'needs retry';
    default:
      return 'queued';
  }
}

function eventLabel(type: string) {
  return EVENT_LABELS[type] || type.replaceAll('_', ' ');
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

function eventMessage(event: WorkflowEvent) {
  switch (event.type) {
    case 'workflow_started':
      return 'Starting the brief.';
    case 'retry_demo':
      return event.message.toLowerCase().includes('recovered')
        ? 'Debug retry recovered; continuing the brief.'
        : 'Debug retry simulated; trying the step again.';
    case 'analyzing':
      return 'Mapping the report into readable sections.';
    case 'chapters_discovered':
      return `Mapped ${event.chapterTotal || event.chapters?.length || 'the'} sections.`;
    case 'awaiting_approval':
      return 'Review the section map before PaperScout continues.';
    case 'approval_received':
      return 'Continuing with the approved section map.';
    case 'intelligence_started':
      return 'Finding key claims, caveats, and research trails.';
    case 'intelligence_completed':
      return 'Claims, caveats, and research trails are ready.';
    case 'chapter_started':
      return event.chapterTotal
        ? `Reading section ${event.chapterIndex} of ${event.chapterTotal}.`
        : 'Reading the next section.';
    case 'chapter_completed':
      return event.chapterTotal
        ? `Finished section ${event.chapterIndex} of ${event.chapterTotal}.`
        : 'Finished a section.';
    case 'chapter_failed':
      return event.chapterIndex ? `Section ${event.chapterIndex} needs another pass.` : 'A section needs another pass.';
    case 'assembling_book':
      return 'Assembling the final research brief.';
    case 'workflow_completed':
      return 'Research brief is ready.';
    case 'workflow_error':
      return event.error || 'The brief could not be completed.';
    default:
      return event.message;
  }
}

function userFacingError(message: string) {
  return message
    .replaceAll('Workflow run', 'Brief build')
    .replaceAll('workflow run', 'brief build')
    .replaceAll('Workflow', 'Brief build')
    .replaceAll('workflow', 'brief build')
    .replaceAll('runId', 'brief id')
    .replaceAll('chapter map', 'section map')
    .replaceAll('Chapter map', 'Section map')
    .replaceAll('chapter', 'section')
    .replaceAll('Chapter', 'Section');
}

export function PDFUploader({ onUploaded }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [savedRun, setSavedRun] = useState<ActiveRun | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [demoRetry, setDemoRetry] = useState(false);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [chapterCards, setChapterCards] = useState<Record<number, ChapterCard>>({});
  const [approvalChapters, setApprovalChapters] = useState<ChapterApproval[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const streamedRunRef = useRef<string | null>(null);

  const isProcessing = step === 'extracting' || step === 'uploading' || step === 'queued' || step === 'approval' || step === 'processing';
  const cards = Object.values(chapterCards).sort((a, b) => a.index - b.index);
  const completedCount = cards.filter((card) => card.status === 'complete').length;
  const latestEvent = events[events.length - 1];
  const label = latestEvent ? eventMessage(latestEvent) : STEP_LABELS[step];

  useEffect(() => {
    setSavedRun(readActiveRun());
  }, []);

  const clearActiveRun = () => {
    window.localStorage.removeItem(ACTIVE_RUN_KEY);
    setSavedRun(null);
  };

  const saveActiveRun = (run: ActiveRun) => {
    window.localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(run));
    setSavedRun(run);
  };

  const resetMissionControl = () => {
    setEvents([]);
    setChapterCards({});
    setApprovalChapters([]);
    streamedRunRef.current = null;
  };

  const applyWorkflowEvent = (event: WorkflowEvent) => {
    setEvents((current) => [...current.slice(-10), event]);

    if (event.type === 'chapters_discovered' || event.type === 'awaiting_approval') {
      const chapters = event.chapters || [];
      setApprovalChapters(chapters);
      setChapterCards((current) => ({
        ...Object.fromEntries(
          chapters.map((chapter) => [
            chapter.index,
            current[chapter.index] || {
              index: chapter.index,
              title: chapter.title,
              status: 'pending' as ChapterStatus,
            },
          ])
        ),
      }));
    }

    if (event.type === 'chapter_started' && event.chapterIndex) {
      setChapterCards((current) => ({
        ...current,
        [event.chapterIndex!]: {
          index: event.chapterIndex!,
          title: event.chapterTitle || current[event.chapterIndex!]?.title || `Section ${event.chapterIndex}`,
          status: 'processing',
        },
      }));
    }

    if ((event.type === 'chapter_completed' || event.type === 'chapter_failed') && event.chapterIndex) {
      setChapterCards((current) => ({
        ...current,
        [event.chapterIndex!]: {
          index: event.chapterIndex!,
          title: event.chapterTitle || current[event.chapterIndex!]?.title || `Section ${event.chapterIndex}`,
          status: event.type === 'chapter_completed' ? 'complete' : 'error',
          error: event.error,
        },
      }));
    }
  };

  const streamWorkflowProgress = async (workflowRunId: string) => {
    if (streamedRunRef.current === workflowRunId) return;
    streamedRunRef.current = workflowRunId;

    try {
      const response = await fetch(`/api/upload-pdf/stream?runId=${encodeURIComponent(workflowRunId)}`, {
        cache: 'no-store',
      });

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!cancelledRef.current) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          applyWorkflowEvent(JSON.parse(line) as WorkflowEvent);
        }
      }
    } catch {
      // The status poller is authoritative; streamed updates are best effort UI polish.
    }
  };

  const pollWorkflowRun = async (workflowRunId: string): Promise<PDF> => {
    for (let attempt = 0; attempt < 360; attempt++) {
      if (cancelledRef.current) throw new Error('Brief build cancelled.');

      const response = await fetch(`/api/upload-pdf/status?runId=${encodeURIComponent(workflowRunId)}`, {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Brief status check failed: ${response.status}`);
      }

      if (Array.isArray(data.chapterMap)) {
        setApprovalChapters(data.chapterMap);
      }

      if (data.book) return data.book as PDF;

      if (data.status === 'awaiting_chapter_map') {
        setStep('approval');
      } else if (data.status === 'failed' || data.status === 'cancelled' || data.status === 'error') {
        throw new Error(data.error || `Brief build ${data.status}`);
      } else {
        setStep(data.status === 'pending' ? 'queued' : 'processing');
      }

      await wait(POLL_DELAY_MS);
    }

    throw new Error('The brief did not finish before the polling timeout.');
  };

  const finishRun = async (workflowRunId: string) => {
    setRunId(workflowRunId);
    void streamWorkflowProgress(workflowRunId);
    const book = await pollWorkflowRun(workflowRunId);
    clearActiveRun();
    setRunId(null);
    setStep('done');
    onUploaded?.(book);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) await handleFile(e.dataTransfer.files[0]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  };

  const extractPDFText = async (file: File): Promise<{ text: string; pageCount: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    if (pdf.numPages > PDF_PROCESSING_LIMITS.maxPageCount) {
      throw new Error(`PDF exceeds the ${PDF_PROCESSING_LIMITS.maxPageCount} page limit.`);
    }

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';

      if (fullText.length > PDF_PROCESSING_LIMITS.maxExtractedTextCharacters) {
        throw new Error(`Extracted text exceeds the ${PDF_PROCESSING_LIMITS.maxExtractedTextCharacters} character limit.`);
      }
    }

    return {
      text: fullText,
      pageCount: pdf.numPages,
    };
  };

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setErrorMsg('Please upload a PDF file.');
      setStep('error');
      return;
    }

    if (file.size > PDF_PROCESSING_LIMITS.maxUploadedFileBytes) {
      setErrorMsg(`PDF files must be ${formatBytes(PDF_PROCESSING_LIMITS.maxUploadedFileBytes)} or smaller.`);
      setStep('error');
      return;
    }

    const pdfId = uuidv4();
    cancelledRef.current = false;
    resetMissionControl();
    setRunId(null);
    setErrorMsg('');

    try {
      setStep('extracting');
      const { text, pageCount } = await extractPDFText(file);

      setStep('uploading');
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId,
          fileName: file.name,
          fileSize: file.size,
          pageCount,
          extractedText: text,
          demoRetry,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.runId && !data.book) throw new Error('The brief could not be started.');

      setStep('queued');

      if (data.runId) {
        saveActiveRun({ runId: data.runId, pdfId, fileName: file.name });
        await finishRun(data.runId);
      } else {
        setStep('done');
        onUploaded?.(data.book);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMsg(userFacingError(msg));
      setStep('error');
    }
  };

  const handleApproveChapterMap = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!runId || approvalChapters.length === 0) return;

    setIsApproving(true);

    try {
      const response = await fetch('/api/upload-pdf/chapter-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, chapters: approvalChapters }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Approval failed: ${response.status}`);
      }

      setApprovalChapters([]);
      setStep('processing');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save the section map';
      setErrorMsg(userFacingError(msg));
      setStep('error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!runId) return;

    cancelledRef.current = true;
    setIsCancelling(true);

    try {
      const response = await fetch('/api/upload-pdf/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Cancel failed: ${response.status}`);
      }

      clearActiveRun();
      setRunId(null);
      setErrorMsg('Brief build cancelled.');
      setStep('error');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to cancel the brief build';
      setErrorMsg(userFacingError(msg));
      setStep('error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResume = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const activeRun = savedRun || readActiveRun();
    if (!activeRun) return;

    cancelledRef.current = false;
    resetMissionControl();
    setErrorMsg('');
    setStep('queued');

    try {
      await finishRun(activeRun.runId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to resume the brief build';
      setErrorMsg(userFacingError(msg));
      setStep('error');
    }
  };

  const handleTryAgain = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelledRef.current = false;
    clearActiveRun();
    resetMissionControl();
    setRunId(null);
    setStep('idle');
    setErrorMsg('');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className={`relative select-none rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 md:p-12
        ${isProcessing ? 'cursor-default' : 'cursor-pointer'}
        ${isDragging ? 'scale-[1.01] border-emerald-400 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/50'}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isProcessing}
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
        <div className="relative">
          {step === 'done' ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          ) : step === 'error' ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <Upload className="h-8 w-8 text-red-600" />
            </div>
          ) : isProcessing ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Upload className="h-8 w-8 text-emerald-700" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className={`text-base font-semibold ${step === 'error' ? 'text-red-600' : 'text-gray-900'}`}>{label}</p>
          {step === 'idle' && <p className="text-sm text-gray-500">PDF files only</p>}
          {step === 'error' && errorMsg && <p className="mx-auto max-w-md text-sm text-gray-500">{errorMsg}</p>}
        </div>

        {!isProcessing && step !== 'done' && (
          <label onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm">
            <input type="checkbox" checked={demoRetry} onChange={(event) => setDemoRetry(event.target.checked)} />
            Debug: simulate retry
          </label>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2">
            {(['extracting', 'uploading', 'queued', 'approval', 'processing', 'done'] as Step[]).map((s, i) => {
              const steps: Step[] = ['extracting', 'uploading', 'queued', 'approval', 'processing', 'done'];
              const currentIdx = steps.indexOf(step);
              const thisIdx = steps.indexOf(s);
              const done = thisIdx < currentIdx;
              const active = thisIdx === currentIdx;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full transition-all ${done ? 'bg-emerald-700' : active ? 'animate-pulse bg-emerald-700' : 'bg-gray-300'}`} />
                  {i < steps.length - 1 && <div className="h-px w-6 bg-gray-300" />}
                </div>
              );
            })}
          </div>
        )}

        {(events.length > 0 || cards.length > 0) && (
          <div className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Research Brief Builder</p>
                <h3 className="mt-1 text-lg font-black text-stone-950">{completedCount}/{cards.length || 0} sections mapped</h3>
              </div>
              {runId && <p className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold text-stone-500">Debug ID {runId.slice(0, 8)}</p>}
            </div>

            {approvalChapters.length > 0 && step === 'approval' && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Section map</p>
                <p className="mt-1 text-sm text-amber-900">Review or rename the sections before PaperScout continues the brief.</p>
                <div className="mt-3 space-y-2">
                  {approvalChapters.map((chapter, index) => (
                    <input
                      key={chapter.index}
                      value={chapter.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(event) => {
                        const next = [...approvalChapters];
                        next[index] = { ...chapter, title: event.target.value };
                        setApprovalChapters(next);
                      }}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                    />
                  ))}
                </div>
                <button
                  onClick={handleApproveChapterMap}
                  disabled={isApproving}
                  className="mt-3 rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
                >
                  {isApproving ? 'Saving map...' : 'Use this section map'}
                </button>
              </div>
            )}

            {cards.length > 0 && (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {cards.map((card) => (
                  <div key={card.index} className={`rounded-xl border p-3 ${statusClass(card.status)}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-black">{card.index}. {card.title}</p>
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-wide">{statusLabel(card.status)}</span>
                    </div>
                    {card.error && <p className="mt-1 text-xs">{card.error}</p>}
                  </div>
                ))}
              </div>
            )}

            {events.length > 0 && (
              <div className="mt-4 space-y-1 border-t border-stone-100 pt-3">
                {events.slice(-5).map((event, index) => (
                  <p key={`${event.at}-${index}`} className="text-xs text-stone-500">
                    <span className="font-bold text-stone-800">{eventLabel(event.type)}</span> - {eventMessage(event)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {runId && isProcessing && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel brief'}
            </button>
          )}

          {savedRun && !isProcessing && step !== 'done' && (
            <button
              onClick={handleResume}
              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              Resume previous brief
            </button>
          )}

          {step === 'error' && (
            <button onClick={handleTryAgain} className="rounded-full px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:text-emerald-800">
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
