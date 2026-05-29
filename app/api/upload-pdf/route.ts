import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { PDF_PROCESSING_LIMITS, truncateString } from '@/lib/pdf-limits';
import { processPDFWorkflow } from '@/lib/pdf-workflow';

export const maxDuration = 300;

type UploadPayload = {
  pdfId: string;
  fileName: string;
  pageCount: number;
  extractedText: string;
  wait: boolean;
  demoRetry: boolean;
};

type UploadValidationResult =
  | { ok: true; value: UploadPayload }
  | { ok: false; error: string; status: number };

class RequestTooLargeError extends Error {}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readContentLength(request: NextRequest): number | null {
  const value = request.headers.get('content-length');
  if (!value) return null;

  const contentLength = Number(value);
  return Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : null;
}

async function readJsonPayload(request: NextRequest): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let raw = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > PDF_PROCESSING_LIMITS.maxRequestBytes) {
      throw new RequestTooLargeError();
    }

    raw += decoder.decode(value, { stream: true });
  }

  raw += decoder.decode();
  return raw.trim() ? JSON.parse(raw) : null;
}

function validateOptionalBoolean(value: unknown, fieldName: string): string | null {
  if (value === undefined || typeof value === 'boolean') return null;
  return `${fieldName} must be a boolean`;
}

function validateUploadPayload(body: unknown): UploadValidationResult {
  if (!isRecord(body)) {
    return { ok: false, error: 'Upload payload must be a JSON object', status: 400 };
  }

  const pdfId = typeof body.pdfId === 'string' ? body.pdfId.trim() : '';
  const fileName = typeof body.fileName === 'string' ? body.fileName.replace(/[\u0000-\u001f\u007f]/g, '').trim() : '';
  const extractedText = typeof body.extractedText === 'string' ? body.extractedText.trim() : '';

  if (!pdfId || !fileName || !extractedText) {
    return { ok: false, error: 'Missing required fields: pdfId, fileName, extractedText', status: 400 };
  }

  if (pdfId.length > PDF_PROCESSING_LIMITS.maxPdfIdCharacters) {
    return { ok: false, error: `pdfId must be ${PDF_PROCESSING_LIMITS.maxPdfIdCharacters} characters or fewer`, status: 400 };
  }

  if (fileName.length > PDF_PROCESSING_LIMITS.maxFileNameCharacters) {
    return { ok: false, error: `fileName must be ${PDF_PROCESSING_LIMITS.maxFileNameCharacters} characters or fewer`, status: 400 };
  }

  if (extractedText.length > PDF_PROCESSING_LIMITS.maxExtractedTextCharacters) {
    return {
      ok: false,
      error: `Extracted text exceeds the ${PDF_PROCESSING_LIMITS.maxExtractedTextCharacters} character limit`,
      status: 413,
    };
  }

  const pageCount = body.pageCount === undefined ? 1 : Number(body.pageCount);
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { ok: false, error: 'pageCount must be a positive integer', status: 400 };
  }

  if (pageCount > PDF_PROCESSING_LIMITS.maxPageCount) {
    return { ok: false, error: `PDF exceeds the ${PDF_PROCESSING_LIMITS.maxPageCount} page limit`, status: 413 };
  }

  if (body.fileSize !== undefined) {
    const fileSize = Number(body.fileSize);

    if (!Number.isInteger(fileSize) || fileSize < 0) {
      return { ok: false, error: 'fileSize must be a non-negative integer when provided', status: 400 };
    }

    if (fileSize > PDF_PROCESSING_LIMITS.maxUploadedFileBytes) {
      return { ok: false, error: `PDF file exceeds the ${PDF_PROCESSING_LIMITS.maxUploadedFileBytes} byte limit`, status: 413 };
    }
  }

  const waitValidation = validateOptionalBoolean(body.wait, 'wait');
  if (waitValidation) {
    return { ok: false, error: waitValidation, status: 400 };
  }

  const demoRetryValidation = validateOptionalBoolean(body.demoRetry, 'demoRetry');
  if (demoRetryValidation) {
    return { ok: false, error: demoRetryValidation, status: 400 };
  }

  return {
    ok: true,
    value: {
      pdfId,
      fileName,
      pageCount,
      extractedText,
      wait: body.wait === true,
      demoRetry: body.demoRetry === true,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = readContentLength(request);
    if (contentLength !== null && contentLength > PDF_PROCESSING_LIMITS.maxRequestBytes) {
      return jsonError(`Upload request exceeds the ${PDF_PROCESSING_LIMITS.maxRequestBytes} byte limit`, 413);
    }

    let body: unknown;

    try {
      body = await readJsonPayload(request);
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        return jsonError(`Upload request exceeds the ${PDF_PROCESSING_LIMITS.maxRequestBytes} byte limit`, 413);
      }

      if (error instanceof SyntaxError) {
        return jsonError('Upload payload must be valid JSON', 400);
      }

      throw error;
    }

    const validation = validateUploadPayload(body);

    if (!validation.ok) {
      return jsonError(validation.error, validation.status);
    }

    const { pdfId, fileName, pageCount, extractedText, wait, demoRetry } = validation.value;

    if (wait) {
      return jsonError('Synchronous wait mode is not available for approval-based processing. Start a run, approve the section map, and poll status instead.', 400);
    }

    const title = truncateString(fileName.replace(/\.pdf$/i, ''), PDF_PROCESSING_LIMITS.maxTitleCharacters) || 'Untitled PDF';

    const run = await start(processPDFWorkflow, [
      {
        pdfId,
        title,
        rawText: extractedText,
        pageCount,
        demoRetry,
      },
    ]);

    return NextResponse.json({ pdfId, runId: run.runId, status: 'running' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
