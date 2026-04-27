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
      <div className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <FileText className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {pdf.title}
            </h3>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm text-muted-foreground">
          <p>{pdf.pageCount} pages</p>
          <p>{formatDate(new Date(pdf.dateAdded))}</p>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-xs font-medium text-primary">
            {pdf.status === 'complete' ? 'Ready' : 'Processing'}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="p-2 hover:bg-muted rounded transition-colors text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
