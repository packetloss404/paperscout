'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function PDFUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    const pdfId = uuidv4();

    try {
      console.log('[v0] Starting upload for:', file.name);
      // Send file to server for processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pdfId', pdfId);

      console.log('[v0] Calling /api/process-pdf');
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      console.log('[v0] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[v0] Upload successful, redirecting to:', `/processing/${pdfId}`);
        // Redirect to processing page
        router.push(`/processing/${pdfId}`);
      } else {
        const errorData = await response.text();
        console.error('[v0] Upload failed:', response.status, errorData);
        alert('Error uploading PDF');
      }
    } catch (error) {
      console.error('[v0] Upload error:', error);
      alert('Error uploading PDF');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/30 hover:border-primary/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploading}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex flex-col items-center gap-3"
      >
        <Upload className="w-12 h-12 text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">
            {isUploading ? 'Uploading...' : 'Drag & drop your PDF here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to select a file
          </p>
        </div>
      </button>
    </div>
  );
}
