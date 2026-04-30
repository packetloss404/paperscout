import { NextRequest, NextResponse } from 'next/server';
import { getHookByToken, getRun } from 'workflow/api';
import { type ChapterMapSummaryItem, type ProcessPDFResult } from '@/lib/pdf-workflow';

function tokenForRun(runId: string) {
  return `chapter-map:${runId}`;
}

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
  }

  try {
    const run = getRun<ProcessPDFResult>(runId);
    const exists = await run.exists;

    if (!exists) {
      return NextResponse.json({ error: 'Workflow run not found', runId }, { status: 404 });
    }

    const workflowStatus = await run.status;

    if (workflowStatus === 'completed') {
      const result = await run.returnValue;
      return NextResponse.json({
        runId,
        status: result.status,
        workflowStatus,
        book: result.book,
        error: result.error,
      });
    }

    try {
      const hook = await getHookByToken(tokenForRun(runId));
      const metadata = hook.metadata as { chapters?: ChapterMapSummaryItem[] } | undefined;

      return NextResponse.json({
        runId,
        status: 'awaiting_chapter_map',
        workflowStatus,
        chapterMap: metadata?.chapters || [],
      });
    } catch {
      // No approval hook yet; continue returning the normal run status.
    }

    return NextResponse.json({ runId, status: workflowStatus, workflowStatus });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to read workflow run';
    return NextResponse.json({ error: msg, runId, status: 'error' }, { status: 500 });
  }
}
