'use client';

import { PDF } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface PDFCardProps {
  pdf: PDF;
  onDelete: (id: string) => void;
}

export function PDFCard({ pdf, onDelete }: PDFCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this book?')) {
      setIsDeleting(true);
      try {
        await fetch(`/api/pdf/${pdf.id}`, { method: 'DELETE' });
        onDelete(pdf.id);
      } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting PDF');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Link href={`/book/${pdf.id}`}>
      <div className="bg-card border border-border rounded-xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col group">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 bg-primary/10 group-hover:bg-primary/15 rounded-lg transition-colors">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {pdf.title}
            </h3>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">📄</span>
            <span>{pdf.pageCount} pages</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">📅</span>
            <span>{formatDate(new Date(pdf.dateAdded))}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {pdf.status === 'complete' ? '✓ Ready' : 'Processing...'}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive/60 hover:text-destructive group/delete"
          >
            <Trash2 className="w-4 h-4 group-hover/delete:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </Link>
  );
}
