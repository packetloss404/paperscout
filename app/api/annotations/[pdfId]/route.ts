import { NextRequest, NextResponse } from 'next/server';
import { db, Annotation } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  const annotations = await db.getAnnotations(params.pdfId);
  return NextResponse.json(annotations);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  const body = await request.json();
  const annotation: Annotation = {
    id: uuidv4(),
    pdfId: params.pdfId,
    paragraphIndex: body.paragraphIndex,
    type: body.type,
    text: body.text,
    createdAt: new Date(),
  };

  await db.saveAnnotation(annotation);
  return NextResponse.json(annotation);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  const { annotationId } = await request.json();
  await db.deleteAnnotation(params.pdfId, annotationId);
  return NextResponse.json({ success: true });
}
