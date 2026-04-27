// Simple in-memory database for PDFs and their content
// In production, this would connect to a real database like Supabase

export interface PDF {
  id: string;
  title: string;
  fileName: string;
  pageCount: number;
  dateAdded: Date;
  content?: string;
  status: 'processing' | 'complete' | 'error';
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
  type: 'highlight' | 'annotation';
  color?: string;
  text: string;
  createdAt: Date;
}

// In-memory storage
const pdfStorage = new Map<string, PDF>();
const annotationStorage = new Map<string, Annotation[]>();

export const db = {
  // PDF operations
  savePDF: async (pdf: PDF): Promise<void> => {
    pdfStorage.set(pdf.id, pdf);
  },

  getPDF: async (id: string): Promise<PDF | null> => {
    return pdfStorage.get(id) || null;
  },

  getAllPDFs: async (): Promise<PDF[]> => {
    return Array.from(pdfStorage.values()).sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  },

  deletePDF: async (id: string): Promise<void> => {
    pdfStorage.delete(id);
    annotationStorage.delete(id);
  },

  updatePDFStatus: async (id: string, status: PDF['status']): Promise<void> => {
    const pdf = pdfStorage.get(id);
    if (pdf) {
      pdf.status = status;
    }
  },

  // Annotation operations
  saveAnnotation: async (annotation: Annotation): Promise<void> => {
    const key = annotation.pdfId;
    if (!annotationStorage.has(key)) {
      annotationStorage.set(key, []);
    }
    annotationStorage.get(key)!.push(annotation);
  },

  getAnnotations: async (pdfId: string): Promise<Annotation[]> => {
    return annotationStorage.get(pdfId) || [];
  },

  deleteAnnotation: async (pdfId: string, annotationId: string): Promise<void> => {
    const annotations = annotationStorage.get(pdfId);
    if (annotations) {
      const index = annotations.findIndex((a) => a.id === annotationId);
      if (index > -1) {
        annotations.splice(index, 1);
      }
    }
  },
};
