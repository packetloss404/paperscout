'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PDFCard } from '@/components/pdf-card';
import { PDF } from '@/lib/db';
import { Logo } from '@/components/logo';
import { FileText, Sparkles, Zap } from 'lucide-react';

const PDFUploader = dynamic(() => import('@/components/pdf-uploader').then(mod => mod.PDFUploader), {
  ssr: false,
  loading: () => <div className="h-48 bg-muted/20 rounded-xl animate-pulse" />,
});

export default function HomePage() {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPDFs();
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
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">
              {pdfs.length} paper{pdfs.length !== 1 ? 's' : ''} in library
            </span>
            <div className="h-8 w-px bg-gray-200 hidden sm:block" />
            <button className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              Upgrade
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Turn research papers into
              <span className="text-indigo-600"> readable content</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Upload any PDF and let AI transform it into beautifully formatted chapters with an intelligent tutor ready to explain complex concepts.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI-Powered Summaries
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-sm font-medium">
                <FileText className="w-4 h-4" />
                Smart Chapters
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                Instant Processing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Upload Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Upload a Paper
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Supports PDF files up to 50MB
              </p>
            </div>
          </div>
          <PDFUploader onUploaded={loadPDFs} />
        </section>

        {/* Library Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Your Library
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {pdfs.length === 0 
                  ? 'No papers yet' 
                  : `${pdfs.length} paper${pdfs.length !== 1 ? 's' : ''} saved`
                }
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-xl mb-4">
                <FileText className="w-7 h-7 text-indigo-600" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No papers yet</p>
              <p className="text-sm text-gray-500">
                Upload your first research paper to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pdfs.map((pdf) => (
                <PDFCard
                  key={pdf.id}
                  pdf={pdf}
                  onDelete={handleDeletePDF}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <p className="text-sm text-gray-500">
              Transform how you read research papers
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
