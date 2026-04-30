import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { message, history, pdfTitle, pdfContent } = await request.json();

    if (!message || !pdfContent) {
      return NextResponse.json(
        { error: 'Missing message or PDF content' },
        { status: 400 }
      );
    }

    // Build context from PDF content
    const pdfContext = String(pdfContent).slice(0, 15000); // Limit context size

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

    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Add history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

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
