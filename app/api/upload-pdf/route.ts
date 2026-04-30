import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { processPDFWorkflow } from '@/lib/pdf-workflow';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfId, fileName, pageCount, extractedText } = body;

    if (!pdfId || !fileName || !extractedText) {
      return NextResponse.json(
        { error: 'Missing required fields: pdfId, fileName, extractedText' },
        { status: 400 }
      );
    }

    const title = fileName.replace(/\.pdf$/i, '');

    const run = await start(processPDFWorkflow, [
      {
        pdfId,
        title,
        rawText: extractedText,
        pageCount: pageCount || 1,
        demoRetry: body.demoRetry === true,
      },
    ]);

    if (body.wait === true) {
      const result = await run.returnValue;

      if (result.status === 'error') {
        return NextResponse.json(
          { error: result.error || 'Processing failed', pdfId, status: 'error' },
          { status: 500 }
        );
      }

      return NextResponse.json({ pdfId, runId: run.runId, status: result.status, book: result.book });
    }

    return NextResponse.json({ pdfId, runId: run.runId, status: 'running' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
