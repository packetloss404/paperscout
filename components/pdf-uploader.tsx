'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type Step = 'idle' | 'reading' | 'extracting' | 'saving' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: 'Drag & drop your PDF here',
  reading: 'Reading PDF...',
  extracting: 'Extracting text & chapters...',
  saving: 'Saving to library...',
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

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setErrorMsg('Please upload a PDF file.');
      setStep('error');
      return;
    }

    const pdfId = uuidv4();
    setErrorMsg('');

    try {
      setStep('reading');
      await new Promise((r) => setTimeout(r, 300));

      setStep('extracting');
      
      // Send file to backend for processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pdfId', pdfId);

      setStep('saving');
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = `Server error ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = text.slice(0, 100) || errorMsg;
        }
        throw new Error(errorMsg);
      }

      await response.json();

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
            {(['reading', 'extracting', 'saving', 'done'] as Step[]).map((s, i) => {
              const steps: Step[] = ['reading', 'extracting', 'saving', 'done'];
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
                  {i < 3 && <div className="w-6 h-px bg-border" />}
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
