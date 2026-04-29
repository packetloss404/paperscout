'use client';

import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';

interface JsonImporterProps {
  onImported?: (pdfId: string) => void;
}

export function JsonImporter({ onImported }: JsonImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFile = async (file: File) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      const response = await fetch('/api/import-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Import failed: ${response.status}`);
      }

      const data = await response.json();
      onImported?.(data.pdfId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      alert(message);
    } finally {
      setIsImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isImporting}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileUp className="h-4 w-4" />
        )}
        {isImporting ? 'Importing...' : 'Import JSON'}
      </button>
    </>
  );
}
