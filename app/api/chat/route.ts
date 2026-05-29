import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_MESSAGE_LENGTH = 2000;
const MAX_PDF_CONTENT_LENGTH = 500_000;

type ChatRole = 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeHistory(value: unknown): { ok: true; messages: ChatMessage[] } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, messages: [] };
  if (!Array.isArray(value)) return { ok: false, error: 'history must be an array when provided' };

  const messages: ChatMessage[] = [];

  for (const item of value.slice(0, MAX_HISTORY_ITEMS)) {
    if (!isRecord(item)) return { ok: false, error: 'history items must be objects' };

    const role = item.role;
    const content = typeof item.content === 'string' ? item.content.trim() : '';

    if (role !== 'user' && role !== 'assistant') {
      return { ok: false, error: 'history item roles must be user or assistant' };
    }

    if (!content) continue;

    if (content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      return { ok: false, error: `history item content exceeds ${MAX_HISTORY_MESSAGE_LENGTH} characters` };
    }

    messages.push({ role, content });
  }

  return { ok: true, messages };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Chat payload must be a JSON object' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const pdfTitle = typeof body.pdfTitle === 'string' ? body.pdfTitle.trim() : '';
    const pdfContent = typeof body.pdfContent === 'string' ? body.pdfContent : '';

    if (!message || !pdfContent) {
      return NextResponse.json(
        { error: 'Missing message or PDF content' },
        { status: 400 }
      );
    }

    if (pdfContent.length > MAX_PDF_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `PDF content exceeds maximum length of ${MAX_PDF_CONTENT_LENGTH} characters` },
        { status: 413 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    const historyResult = normalizeHistory(body.history);
    if (!historyResult.ok) {
      return NextResponse.json({ error: historyResult.error }, { status: 400 });
    }

    // Build context from PDF content
    const pdfContext = pdfContent.slice(0, 15000); // Limit context size

    // Build messages for the AI
    const systemPrompt = `You are a helpful AI assistant that answers questions about the following research paper/document.

DOCUMENT TITLE: ${pdfTitle || 'Untitled paper'}

DOCUMENT CONTENT:
${pdfContext}

---

Instructions:
- Act like a research analyst, not a tutor.
- Answer based on the document content above.
- If the answer isn't in the document, say so.
- When useful, suggest exact search queries the user can run next.
- Do not fabricate URLs or citations.
- Use concise headings and bullets.
- When referencing specific parts, quote them briefly`;

    const messages: ChatMessage[] = [...historyResult.messages];

    // Add current message
    messages.push({ role: 'user', content: message });

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages,
    });

    return NextResponse.json({ response: result.text });
  } catch (error) {
    console.error('Chat error:', error);
    const msg = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
