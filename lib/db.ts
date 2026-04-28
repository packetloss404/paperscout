import { put, del, get } from "@vercel/blob";

export interface PDF {
  id: string;
  title: string;
  fileName: string;
  pageCount: number;
  dateAdded: string;
  content?: string;
  status: "processing" | "complete" | "error";
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  children?: Chapter[];
}

export interface Annotation {
  id: string;
  pdfId: string;
  paragraphIndex: number;
  type: "highlight" | "annotation";
  color?: string;
  text: string;
  createdAt: string;
}

const PDF_PREFIX = "pdfs/";
const ANNOTATIONS_PREFIX = "annotations/";

export const db = {
  savePDF: async (pdf: PDF): Promise<void> => {
    const key = `${PDF_PREFIX}${pdf.id}.json`;
    await put(key, JSON.stringify(pdf), { contentType: "application/json" });
  },

  getPDF: async (id: string): Promise<PDF | null> => {
    try {
      const key = `${PDF_PREFIX}${id}.json`;
      const blob = await get(key);
      if (!blob) return null;
      const text = await blob.text();
      return JSON.parse(text) as PDF;
    } catch {
      return null;
    }
  },

  getAllPDFs: async (): Promise<PDF[]> => {
    return [];
  },

  deletePDF: async (id: string): Promise<void> => {
    try {
      await del(`${PDF_PREFIX}${id}.json`);
    } catch {}
  },

  updatePDFStatus: async (
    id: string,
    status: PDF["status"]
  ): Promise<void> => {
    const pdf = await db.getPDF(id);
    if (pdf) {
      pdf.status = status;
      await db.savePDF(pdf);
    }
  },

  saveAnnotation: async (annotation: Annotation): Promise<void> => {
    const existing = await db.getAnnotations(annotation.pdfId);
    existing.push(annotation);
    const key = `${ANNOTATIONS_PREFIX}${annotation.pdfId}.json`;
    await put(key, JSON.stringify(existing), { contentType: "application/json" });
  },

  getAnnotations: async (pdfId: string): Promise<Annotation[]> => {
    try {
      const key = `${ANNOTATIONS_PREFIX}${pdfId}.json`;
      const blob = await get(key);
      if (!blob) return [];
      const text = await blob.text();
      return JSON.parse(text) as Annotation[];
    } catch {
      return [];
    }
  },

  deleteAnnotation: async (
    pdfId: string,
    annotationId: string
  ): Promise<void> => {
    const existing = await db.getAnnotations(pdfId);
    const filtered = existing.filter((a) => a.id !== annotationId);
    const key = `${ANNOTATIONS_PREFIX}${pdfId}.json`;
    await put(key, JSON.stringify(filtered), { contentType: "application/json" });
  },
};
