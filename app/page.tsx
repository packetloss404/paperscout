'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { JsonImporter } from '@/components/json-importer';
import { PDFCard } from '@/components/pdf-card';
import { PDF } from '@/lib/db';
import { deleteLocalBook, loadLocalBooks, upsertLocalBook } from '@/lib/local-library';
import { createSampleReport } from '@/lib/sample-report';
import { Logo } from '@/components/logo';
import { Compass, FileJson, FileText, Link2, Search, Sparkles } from 'lucide-react';

const PDFUploader = dynamic(() => import('@/components/pdf-uploader').then(mod => mod.PDFUploader), {
  ssr: false,
  loading: () => <div className="h-48 bg-muted/20 rounded-xl animate-pulse" />,
});

export default function HomePage() {
  const router = useRouter();
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPdfs(loadLocalBooks());
    setIsLoading(false);
  }, []);

  const handleDeletePDF = (id: string) => {
    setPdfs(deleteLocalBook(id));
  };

  const handleUploaded = (book: PDF) => {
    setPdfs(upsertLocalBook(book));
    router.push(`/book/${book.id}`);
  };

  const handleImported = (book: PDF) => {
    setPdfs(upsertLocalBook(book));
  };

  const handleLoadDemo = () => {
    const sample = createSampleReport();
    setPdfs(upsertLocalBook(sample));
    router.push(`/book/${sample.id}`);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">
              {pdfs.length} report{pdfs.length !== 1 ? 's' : ''} in library
            </span>
            <div className="h-8 w-px bg-gray-200 hidden sm:block" />
            <span className="text-sm font-medium text-emerald-700 hidden sm:block">
              No login required
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Turn reports into
              <span className="text-emerald-700"> research intelligence</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Upload a PDF and get an analyst brief, key claims, caveats, and follow-up research links to keep investigating.
            </p>
            
            <div className="mb-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#upload"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition-all hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-xl"
              >
                <FileText className="h-4 w-4" />
                Upload your own PDF
              </a>
              <button
                type="button"
                onClick={handleLoadDemo}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
              >
                <Compass className="h-4 w-4" />
                Open demo brief
              </button>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Analyst Brief
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-800 rounded-full text-sm font-medium">
                <Search className="w-4 h-4" />
                Research Trails
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-800 rounded-full text-sm font-medium">
                <Link2 className="w-4 h-4" />
                Scholar Links
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                <FileJson className="w-4 h-4" />
                Exportable JSON
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Upload Section */}
        <section id="upload" className="mb-16 scroll-mt-24">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Upload a Report
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                PaperScout will read the PDF, map sections, surface claims, check caveats, and build research trails.
              </p>
            </div>
            <JsonImporter onImported={handleImported} />
          </div>
          <PDFUploader onUploaded={handleUploaded} />
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
                  ? 'No reports yet' 
                  : `${pdfs.length} report${pdfs.length !== 1 ? 's' : ''} saved`
                }
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-xl mb-4">
                <FileText className="w-7 h-7 text-emerald-700" />
              </div>
              <p className="text-gray-900 font-medium mb-1">No reports yet</p>
              <p className="text-sm text-gray-500">
                Upload your first report or research paper to get started
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
              Analyze reports, preserve the brief, follow the links
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
