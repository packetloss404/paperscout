import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: 'Missing filename' },
        { status: 400 }
      );
    }

    // Create a temporary empty blob to get a signed URL for client-side upload
    // In production, you'd use client-side upload with signed URLs
    // For now, we'll return a simple approach: the client will upload directly
    const pathname = `pdfs/${Date.now()}-${filename}`;

    return NextResponse.json({
      pathname,
      success: true,
    });
  } catch (error) {
    console.error('[v0] Upload URL error:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
