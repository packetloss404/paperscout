import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const pdfs = await db.getAllPDFs();
  return NextResponse.json(pdfs);
}
