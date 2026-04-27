import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[v0] GET /api/pdf/:id', params.id);
  const pdf = await db.getPDF(params.id);
  console.log('[v0] PDF found:', !!pdf);
  if (!pdf) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }
  return NextResponse.json(pdf);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.deletePDF(params.id);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pdf = await db.getPDF(params.id);
  if (!pdf) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }

  const updates = await request.json();
  const updated = { ...pdf, ...updates };
  await db.savePDF(updated);

  return NextResponse.json(updated);
}
