import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Blob uploads are disabled. PDFs are processed from browser-extracted text.' },
    { status: 410 }
  );
}
