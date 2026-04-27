'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PDF } from '@/lib/db';
import { Loader2 } from 'lucide-react';

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const pdfId = params.id as string;

  const [progress, setProgress] = useState('Analyzing structure...');
  const [pdf, setPdf] = useState<PDF | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/pdf/${pdfId}`);
        if (response.ok) {
          const data: PDF = await response.json();
          setPdf(data);

          if (data.status === 'complete') {
            setProgress('Done');
            setTimeout(() => {
              router.push(`/book/${pdfId}`);
            }, 500);
          } else if (data.status === 'error') {
            setProgress('Error processing PDF');
          } else {
            // Update progress message
            if (data.chapters && data.chapters.length > 0) {
              setProgress(`Converting chapter ${Math.min(1, data.chapters.length)}/${data.chapters.length}...`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check processing status:', error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [pdfId, router]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Processing PDF
        </h1>

        <p className="text-lg text-muted-foreground mb-6">{pdf?.title}</p>

        <div className="bg-card border border-border rounded-lg p-6 inline-block">
          <p className="text-primary font-medium">{progress}</p>
          {pdf?.status === 'error' && (
            <div className="mt-4">
              <p className="text-destructive text-sm mb-3">
                There was an error processing your PDF
              </p>
              <button
                onClick={() => router.push('/')}
                className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
