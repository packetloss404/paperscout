import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing filename' },
        { status: 400 }
      );
    }

    // Import here to avoid issues in development
    const { getClientStore } = await import('@vercel/blob');
    const clientStore = getClientStore();

    const response = await clientStore.createMultipartUpload({
      pathname: `pdfs/${Date.now()}-${filename}`,
      contentType: 'application/pdf',
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v0] Upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
