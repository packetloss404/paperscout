import { NextRequest, NextResponse } from 'next/server';
import { getRun } from 'workflow/api';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const runId = typeof body.runId === 'string' ? body.runId : '';

  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
  }

  try {
    const run = getRun(runId);

    if (!(await run.exists)) {
      return NextResponse.json({ error: 'Workflow run not found', runId }, { status: 404 });
    }

    const workflowStatus = await run.status;

    if (workflowStatus === 'completed' || workflowStatus === 'failed' || workflowStatus === 'cancelled') {
      return NextResponse.json({ runId, status: workflowStatus, workflowStatus });
    }

    await run.cancel();
    return NextResponse.json({ runId, status: 'cancelled', workflowStatus: 'cancelled' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to cancel workflow run';
    return NextResponse.json({ error: msg, runId, status: 'error' }, { status: 500 });
  }
}
