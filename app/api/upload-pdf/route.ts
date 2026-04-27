import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pdfId = formData.get('pdfId') as string;

    if (!file || !pdfId) {
      return NextResponse.json(
        { error: 'Missing file or PDF ID' },
        { status: 400 }
      );
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    console.log('[v0] Uploading PDF to Blob:', file.name, 'Size:', file.size);

    // Upload to Vercel Blob
    const blob = await put(`pdfs/${Date.now()}-${file.name}`, file, {
      access: 'private',
    });

    console.log('[v0] PDF uploaded to Blob:', blob.pathname);

    return NextResponse.json({
      pdfId,
      blobPathname: blob.pathname,
      success: true,
    });
  } catch (error) {
    console.error('[v0] Upload error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to upload PDF';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
