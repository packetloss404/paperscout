'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PDFCard } from '@/components/pdf-card';
import { PDF } from '@/lib/db';
import { BookOpen } from 'lucide-react';

const PDFUploader = dynamic(() => import('@/components/pdf-uploader').then(mod => mod.PDFUploader), {
  ssr: false,
  loading: () => <div className="h-48 bg-muted/20 rounded-xl animate-pulse" />,
});

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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-lg">
              <BookOpen className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">PDF Textbook</h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Convert research papers into interactive books
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Upload Section */}
        <div className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Upload a PDF
            </h2>
            <p className="text-muted-foreground">
              Drag and drop your PDF or click to select a file
            </p>
          </div>
          <PDFUploader />
        </div>

        {/* Library Section */}
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Your Library
            </h2>
            <p className="text-muted-foreground">
              {pdfs.length} {pdfs.length === 1 ? 'book' : 'books'} saved
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-10 h-10 border-3 border-primary border-t-transparent rounded-full" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-border">
              <BookOpen className="w-14 h-14 text-primary/40 mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No books yet</p>
              <p className="text-sm text-muted-foreground">
                Upload your first PDF to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
