import { NextRequest, NextResponse } from 'next/server';
import { getHookByToken, getRun, resumeHook } from 'workflow/api';
import { type ChapterMapSummaryItem } from '@/lib/pdf-workflow';

function tokenForRun(runId: string) {
  return `chapter-map:${runId}`;
}

function isTerminalStatus(status: string) {
  return status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'canceled';
}

function normalizeChapters(value: unknown): Array<{ index: number; title: string }> | null {
  if (!Array.isArray(value)) return null;

  const chapters = value
    .map((chapter) => {
      if (!chapter || typeof chapter !== 'object') return null;
      const candidate = chapter as { index?: unknown; title?: unknown };
      const index = Number(candidate.index);
      const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
      return Number.isInteger(index) && index > 0 && title ? { index, title } : null;
    })
    .filter((chapter): chapter is { index: number; title: string } => Boolean(chapter));

  return chapters.length > 0 ? chapters : null;
}

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
  }

  try {
    const hook = await getHookByToken(tokenForRun(runId));
    const metadata = hook.metadata as { chapters?: ChapterMapSummaryItem[]; title?: string } | undefined;

    return NextResponse.json({
      runId: hook.runId,
      status: 'awaiting_chapter_map',
      chapterMap: metadata?.chapters || [],
      title: metadata?.title,
    });
  } catch {
    return NextResponse.json({ error: 'Chapter map approval is not available', runId }, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const runId = typeof body.runId === 'string' ? body.runId : '';
  const chapters = normalizeChapters(body.chapters);

  if (!runId || !chapters) {
    return NextResponse.json({ error: 'Missing required fields: runId, chapters' }, { status: 400 });
  }

  try {
    const run = getRun(runId);

    if (!(await run.exists)) {
      return NextResponse.json({ error: 'Workflow run not found', runId }, { status: 404 });
    }

    const workflowStatus = await run.status;

    if (isTerminalStatus(workflowStatus)) {
      return NextResponse.json(
        { error: `Cannot approve a ${workflowStatus} workflow run`, runId, status: workflowStatus, workflowStatus },
        { status: 409 }
      );
    }

    const hook = await resumeHook(tokenForRun(runId), {
      chapters,
      approvedAt: new Date().toISOString(),
    });

    return NextResponse.json({ runId: hook.runId, status: 'resumed' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to resume workflow';
    return NextResponse.json({ error: msg, runId, status: 'error' }, { status: 404 });
  }
}
