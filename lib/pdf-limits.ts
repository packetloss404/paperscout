export const PDF_PROCESSING_LIMITS = {
  maxRequestBytes: 2_500_000,
  maxUploadedFileBytes: 25 * 1024 * 1024,
  maxFileNameCharacters: 220,
  maxPdfIdCharacters: 128,
  maxPageCount: 250,
  maxExtractedTextCharacters: 500_000,
  maxTitleCharacters: 180,
  maxChapterCount: 24,
  maxChapterTitleCharacters: 120,
  maxChapterTextCharacters: 16_000,
  chapterConversionConcurrency: 3,
  maxAnalysisInputCharacters: 50_000,
  maxIntelligenceInputCharacters: 60_000,
  maxChapterPromptCharacters: 12_000,
} as const;

export function truncateString(value: string, maxCharacters: number): string {
  return value.length > maxCharacters ? value.slice(0, maxCharacters).trimEnd() : value;
}
