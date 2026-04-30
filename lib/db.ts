export interface PDF {
  id: string;
  title: string;
  fileName: string;
  pageCount: number;
  dateAdded: string;
  content?: string;
  status: "processing" | "complete" | "error";
  chapters?: Chapter[];
  intelligence?: ResearchIntelligence;
  scoutBoard?: ScoutBoardItem[];
}

export interface ResearchIntelligence {
  category: string;
  executiveBrief: string;
  whyItMatters: string;
  keyClaims: string[];
  claimCards?: ClaimCard[];
  caveats: string[];
  entities: string[];
  citationSignals: CitationSignal[];
  researchTrails: ResearchTrail[];
  skepticMode?: SkepticSignal[];
  weirdFindings?: WeirdFinding[];
}

export interface ClaimCard {
  claim: string;
  evidence: string;
  caveat: string;
  supportLevel: "Strong" | "Medium" | "Weak" | "Needs verification";
  query: string;
  links: ResearchLink[];
}

export interface CitationSignal {
  label: string;
  type: "citation" | "footnote" | "source" | "dataset" | "method";
  reason: string;
  query: string;
  links: ResearchLink[];
}

export interface ResearchTrail {
  title: string;
  reason: string;
  query: string;
  links: ResearchLink[];
}

export interface SkepticSignal {
  label: string;
  type: "assumption" | "missingEvidence" | "leap" | "verification" | "dissent";
  reason: string;
  query: string;
  links: ResearchLink[];
}

export interface WeirdFinding {
  label: string;
  type: "Buried caveat" | "Big claim" | "Thin support" | "Rabbit hole";
  reason: string;
  query: string;
  links: ResearchLink[];
}

export interface ScoutBoardItem {
  id: string;
  kind: "claim" | "caveat" | "citation" | "trail" | "entity" | "skeptic" | "weird";
  title: string;
  detail: string;
  status: "To verify" | "Interesting" | "Read next" | "Done";
  links?: ResearchLink[];
  createdAt: string;
}

export interface ResearchLink {
  label: string;
  url: string;
  source: string;
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

// Server-side fallback only. The hackathon app stores books in browser localStorage
// so demos do not depend on auth, databases, or paid Vercel storage.
const pdfStorage = new Map<string, PDF>();
const annotationStorage = new Map<string, Annotation[]>();

export const db = {
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

  updatePDFStatus: async (id: string, status: PDF["status"]): Promise<void> => {
    const pdf = pdfStorage.get(id);
    if (pdf) pdfStorage.set(id, { ...pdf, status });
  },

  saveAnnotation: async (annotation: Annotation): Promise<void> => {
    const annotations = annotationStorage.get(annotation.pdfId) || [];
    annotationStorage.set(annotation.pdfId, [...annotations, annotation]);
  },

  getAnnotations: async (pdfId: string): Promise<Annotation[]> => {
    return annotationStorage.get(pdfId) || [];
  },

  deleteAnnotation: async (pdfId: string, annotationId: string): Promise<void> => {
    const annotations = annotationStorage.get(pdfId) || [];
    annotationStorage.set(
      pdfId,
      annotations.filter((annotation) => annotation.id !== annotationId)
    );
  },
};
