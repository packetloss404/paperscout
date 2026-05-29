import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const pdfs = await db.getAllPDFs();
  return NextResponse.json(pdfs);
}
