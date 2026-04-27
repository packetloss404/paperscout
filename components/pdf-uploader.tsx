'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { v4 as uuidv4 } from 'uuid';

// Set up the worker - use local copy instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type Step = 'idle' | 'extracting' | 'uploading' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: 'Drag & drop your PDF here',
  extracting: 'Extracting text from PDF...',
  uploading: 'Uploading...',
  done: 'Done!',
  error: 'Something went wrong',
};

export function PDFUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isProcessing = step !== 'idle' && step !== 'error';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) await handleFile(e.dataTransfer.files[0]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  };

  const extractPDFText = async (file: File): Promise<{ text: string; pageCount: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    return {
      text: fullText,
      pageCount: pdf.numPages,
    };
  };

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setErrorMsg('Please upload a PDF file.');
      setStep('error');
      return;
    }

    const pdfId = uuidv4();
    setErrorMsg('');

    try {
      // Step 1: Extract text from PDF client-side
      setStep('extracting');
      const { text, pageCount } = await extractPDFText(file);

      // Step 2: Upload extracted text to server
      setStep('uploading');
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId,
          fileName: file.name,
          pageCount,
          extractedText: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      setStep('done');
      await new Promise((r) => setTimeout(r, 500));
      router.push(`/book/${pdfId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors select-none
        ${isProcessing ? 'cursor-default' : 'cursor-pointer'}
        ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/50'}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isProcessing}
      />

      <div className="inline-flex flex-col items-center gap-4">
        {step === 'done' ? (
          <CheckCircle2 className="w-12 h-12 text-primary" />
        ) : step === 'error' ? (
          <Upload className="w-12 h-12 text-destructive" />
        ) : isProcessing ? (
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        ) : (
          <Upload className="w-12 h-12 text-muted-foreground" />
        )}

        <div>
          <p className={`font-semibold ${step === 'error' ? 'text-destructive' : 'text-foreground'}`}>
            {STEP_LABELS[step]}
          </p>
          {step === 'idle' && (
            <p className="text-sm text-muted-foreground mt-1">or click to select a file</p>
          )}
          {step === 'error' && errorMsg && (
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 mt-1">
            {(['extracting', 'uploading', 'done'] as Step[]).map((s, i) => {
              const steps: Step[] = ['extracting', 'uploading', 'done'];
              const currentIdx = steps.indexOf(step);
              const thisIdx = steps.indexOf(s);
              const done = thisIdx < currentIdx;
              const active = thisIdx === currentIdx;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      done ? 'bg-primary' : active ? 'bg-primary animate-pulse' : 'bg-border'
                    }`}
                  />
                  {i < 2 && <div className="w-6 h-px bg-border" />}
                </div>
              );
            })}
          </div>
        )}

        {step === 'error' && (
          <button
            onClick={(e) => { e.stopPropagation(); setStep('idle'); setErrorMsg(''); }}
            className="mt-1 text-sm text-primary underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
