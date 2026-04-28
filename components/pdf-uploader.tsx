'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { v4 as uuidv4 } from 'uuid';

// Set up the worker - use local copy instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type Step = 'idle' | 'extracting' | 'uploading' | 'processing' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: 'Drag & drop your PDF here',
  extracting: 'Extracting text from PDF...',
  uploading: 'Uploading extracted text...',
  processing: 'AI is turning this into a textbook...',
  done: 'Ready in your library',
  error: 'Something went wrong',
};

interface PDFUploaderProps {
  onUploaded?: (pdfId: string) => void;
}

export function PDFUploader({ onUploaded }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = step === 'extracting' || step === 'uploading' || step === 'processing';

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

      // Step 2: Upload extracted text and wait for AI processing to complete
      setStep('uploading');
      const uploadPromise = fetch('/api/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId,
          fileName: file.name,
          pageCount,
          extractedText: text,
        }),
      });

      setStep('processing');
      const response = await uploadPromise;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      setStep('done');
      onUploaded?.(pdfId);
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
      className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 select-none
        ${isProcessing ? 'cursor-default' : 'cursor-pointer'}
        ${isDragging 
          ? 'border-indigo-400 bg-indigo-50 scale-[1.01]' 
          : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50'
        }
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

      <div className="inline-flex flex-col items-center gap-5">
        <div className="relative">
          {step === 'done' ? (
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          ) : step === 'error' ? (
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-red-600" />
            </div>
          ) : isProcessing ? (
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-indigo-600" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className={`text-base font-semibold ${step === 'error' ? 'text-red-600' : 'text-gray-900'}`}>
            {STEP_LABELS[step]}
          </p>
          {step === 'idle' && (
            <p className="text-sm text-gray-500">PDF files only</p>
          )}
          {step === 'error' && errorMsg && (
            <p className="text-sm text-gray-500 max-w-xs">{errorMsg}</p>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2">
            {(['extracting', 'uploading', 'processing', 'done'] as Step[]).map((s, i) => {
              const steps: Step[] = ['extracting', 'uploading', 'processing', 'done'];
              const currentIdx = steps.indexOf(step);
              const thisIdx = steps.indexOf(s);
              const done = thisIdx < currentIdx;
              const active = thisIdx === currentIdx;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${
                      done ? 'bg-indigo-600' : active ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'
                    }`}
                  />
                  {i < steps.length - 1 && <div className="w-6 h-px bg-gray-300" />}
                </div>
              );
            })}
          </div>
        )}

        {step === 'error' && (
          <button
            onClick={(e) => { e.stopPropagation(); setStep('idle'); setErrorMsg(''); }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
