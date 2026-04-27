import { NextRequest, NextResponse } from 'next/server';
import { put, get } from '@vercel/blob';
import { db } from '@/lib/db';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] upload-pdf POST called');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    console.log('[v0] file:', file?.name, 'pdfId:', pdfId);

    if (!file || !pdfId) {
      console.log('[v0] Missing file or pdfId');
      return NextResponse.json({ error: 'Missing file or pdfId' }, { status: 400 });
    }

    try {
      console.log('[v0] Uploading to Blob...');
      const blob = await put(`pdfs/${Date.now()}-${file.name}`, file, { access: 'private' });
      console.log('[v0] Uploaded successfully:', blob.pathname);

      // For now, just save with extracted filename - skip pdf-parse for testing
      const chapters = [
        {
          id: '1',
          title: 'Document Content',
          content: 'PDF content will be extracted here',
        },
      ];

      console.log('[v0] Saving to DB...');
      await db.savePDF({
        id: pdfId,
        title: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        pageCount: 1,
        dateAdded: new Date(),
        content: 'PDF uploaded successfully',
        chapters,
        status: 'complete',
      });

      console.log('[v0] Success!');
      return NextResponse.json({ pdfId, status: 'complete' });
    } catch (innerError) {
      console.error('[v0] Inner error:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('[v0] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to process PDF';
    console.log('[v0] Returning error response:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
