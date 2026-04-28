import { put, del, get } from "@vercel/blob";

const JSON_BLOB_OPTIONS = {
  contentType: "application/json",
  access: "private" as const,
  allowOverwrite: true,
};

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
const INDEX_KEY = "pdf-index.json";

export const db = {
  savePDF: async (pdf: PDF): Promise<void> => {
    const key = `${PDF_PREFIX}${pdf.id}.json`;
    await put(key, JSON.stringify(pdf), JSON_BLOB_OPTIONS);
    await addToIndex(pdf.id);
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
    try {
      const indexBlob = await get(INDEX_KEY);
      if (!indexBlob) return [];
      const indexText = await indexBlob.text();
      const ids: string[] = JSON.parse(indexText);
      const pdfs: PDF[] = [];
      for (const id of ids) {
        const pdf = await db.getPDF(id);
        if (pdf) pdfs.push(pdf);
      }
      return pdfs.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    } catch {
      return [];
    }
  },

  deletePDF: async (id: string): Promise<void> => {
    try {
      await del(`${PDF_PREFIX}${id}.json`);
      await removeFromIndex(id);
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
    await put(key, JSON.stringify(existing), JSON_BLOB_OPTIONS);
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
    await put(key, JSON.stringify(filtered), JSON_BLOB_OPTIONS);
  },
};

async function addToIndex(id: string): Promise<void> {
  try {
    const indexBlob = await get(INDEX_KEY);
    let ids: string[] = [];
    if (indexBlob) {
      const text = await indexBlob.text();
      ids = JSON.parse(text);
    }
    if (!ids.includes(id)) {
      ids.push(id);
      await put(INDEX_KEY, JSON.stringify(ids), JSON_BLOB_OPTIONS);
    }
  } catch {
    await put(INDEX_KEY, JSON.stringify([id]), JSON_BLOB_OPTIONS);
  }
}

async function removeFromIndex(id: string): Promise<void> {
  try {
    const indexBlob = await get(INDEX_KEY);
    if (!indexBlob) return;
    const text = await indexBlob.text();
    let ids: string[] = JSON.parse(text);
    ids = ids.filter((i) => i !== id);
    await put(INDEX_KEY, JSON.stringify(ids), JSON_BLOB_OPTIONS);
  } catch {}
}
