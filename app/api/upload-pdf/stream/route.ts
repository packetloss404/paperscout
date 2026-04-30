import { NextRequest } from 'next/server';
import { getRun } from 'workflow/api';
import { type PDFWorkflowEvent, type ProcessPDFResult } from '@/lib/pdf-workflow';

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get('runId');

  if (!runId) {
    return Response.json({ error: 'Missing runId' }, { status: 400 });
  }

  const run = getRun<ProcessPDFResult>(runId);

  if (!(await run.exists)) {
    return Response.json({ error: 'Workflow run not found', runId }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const readable = run.getReadable<PDFWorkflowEvent>({ namespace: 'progress' }).pipeThrough(
    new TransformStream<PDFWorkflowEvent, Uint8Array>({
      transform(event, controller) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      },
    })
  );

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
