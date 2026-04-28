import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { pdfId, message, history } = await request.json();

    if (!pdfId || !message) {
      return NextResponse.json(
        { error: 'Missing pdfId or message' },
        { status: 400 }
      );
    }

    // Get PDF content for context
    const pdf = await db.getPDF(pdfId);
    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Build context from PDF content
    const pdfContext = pdf.content.slice(0, 15000); // Limit context size

    // Build messages for the AI
    const systemPrompt = `You are a helpful AI assistant that answers questions about the following research paper/document.

DOCUMENT TITLE: ${pdf.title}

DOCUMENT CONTENT:
${pdfContext}

---

Instructions:
- Answer questions based on the document content above
- Be concise but thorough
- If the answer isn't in the document, say so
- Use clear formatting with paragraphs
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
      model: 'gpt-4o-mini',
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
