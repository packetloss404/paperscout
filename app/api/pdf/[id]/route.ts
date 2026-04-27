import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdf = await db.getPDF(id);
  if (!pdf) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }
  return NextResponse.json(pdf);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.deletePDF(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdf = await db.getPDF(id);
  if (!pdf) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }

  const updates = await request.json();
  const updated = { ...pdf, ...updates };
  await db.savePDF(updated);

  return NextResponse.json(updated);
}
