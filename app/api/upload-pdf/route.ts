import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] START');
    
    // Step 1: Parse form data
    let formData;
    try {
      formData = await request.formData();
      console.log('[v0] FormData parsed');
    } catch (e) {
      console.error('[v0] FormData parse error:', e);
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;
    console.log('[v0] file:', file?.name, 'pdfId:', pdfId);

    if (!file || !pdfId) {
      return NextResponse.json({ error: 'Missing file or pdfId' }, { status: 400 });
    }

    // Step 2: Import and upload to Blob
    let blob;
    try {
      console.log('[v0] Importing blob module');
      const { put } = await import('@vercel/blob');
      console.log('[v0] Uploading file to blob...');
      blob = await put(`pdfs/${Date.now()}-${file.name}`, file, { access: 'private' });
      console.log('[v0] Upload complete:', blob.pathname);
    } catch (e) {
      console.error('[v0] Blob upload error:', e);
      return NextResponse.json({ error: `Blob error: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }

    // Step 3: Import and save to database
    try {
      console.log('[v0] Importing db module');
      const { db } = await import('@/lib/db');
      console.log('[v0] Saving to database');
      
      await db.savePDF({
        id: pdfId,
        title: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        pageCount: 1,
        dateAdded: new Date(),
        content: 'PDF uploaded successfully',
        chapters: [
          {
            id: '1',
            title: 'Document',
            content: 'PDF content will be extracted here',
          },
        ],
        status: 'complete',
      });
      console.log('[v0] Saved to database');
    } catch (e) {
      console.error('[v0] Database error:', e);
      return NextResponse.json({ error: `Database error: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }

    // Step 4: Return success
    console.log('[v0] SUCCESS');
    return NextResponse.json({ pdfId, status: 'complete' });
  } catch (error) {
    console.error('[v0] Unhandled error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
