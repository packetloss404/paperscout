'use client';

import { useEffect, useState } from 'react';
import { PDFUploader } from '@/components/pdf-uploader';
import { PDFCard } from '@/components/pdf-card';
import { PDF } from '@/lib/db';
import { BookOpen } from 'lucide-react';

export default function HomePage() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPDFs();
    // Poll for updates every 2 seconds
    const interval = setInterval(loadPDFs, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadPDFs = async () => {
    try {
      const response = await fetch('/api/pdfs');
      if (response.ok) {
        const data = await response.json();
        setPdfs(data);
      }
    } catch (error) {
      console.error('Failed to load PDFs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePDF = (id: string) => {
    setPdfs(pdfs.filter((p) => p.id !== id));
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">PDF Textbook</h1>
          </div>
          <p className="text-muted-foreground">
            Convert research papers into interactive books
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Upload Section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Upload a PDF
          </h2>
          <PDFUploader />
        </div>

        {/* Library Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Your Library
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No PDFs yet</p>
              <p className="text-sm text-muted-foreground">
                Upload a PDF to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfs.map((pdf) => (
                <PDFCard
                  key={pdf.id}
                  pdf={pdf}
                  onDelete={handleDeletePDF}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
