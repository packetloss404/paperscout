import { NextRequest, NextResponse } from 'next/server';
import { db, Annotation } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pdfId: string }> }
) {
  const { pdfId } = await params;
  const annotations = await db.getAnnotations(pdfId);
  return NextResponse.json(annotations);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pdfId: string }> }
) {
  const { pdfId } = await params;
  const body = await request.json();
  const annotation: Annotation = {
    id: uuidv4(),
    pdfId,
    paragraphIndex: body.paragraphIndex,
    type: body.type,
    text: body.text,
    createdAt: new Date().toISOString(),
  };

  await db.saveAnnotation(annotation);
  return NextResponse.json(annotation);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pdfId: string }> }
) {
  const { pdfId } = await params;
  const { annotationId } = await request.json();
  await db.deleteAnnotation(pdfId, annotationId);
  return NextResponse.json({ success: true });
}
