'use client';

import { PDF } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { FileText, Trash2, Clock, Layers } from 'lucide-react';
import { useState } from 'react';

interface PDFCardProps {
  pdf: PDF;
  onDelete: (id: string) => void;
}

export function PDFCard({ pdf, onDelete }: PDFCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this paper?')) {
      setIsDeleting(true);
      try {
        await fetch(`/api/pdf/${pdf.id}`, { method: 'DELETE' });
        onDelete(pdf.id);
      } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting paper');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Link href={`/book/${pdf.id}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col group">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-indigo-50 group-hover:bg-indigo-100 rounded-lg transition-colors flex-shrink-0">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors text-sm leading-snug">
              {pdf.title}
            </h3>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>{pdf.pageCount} pages</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(new Date(pdf.dateAdded))}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            pdf.status === 'complete' 
              ? 'bg-green-50 text-green-700' 
              : 'bg-amber-50 text-amber-700'
          }`}>
            {pdf.status === 'complete' ? 'Ready' : 'Processing'}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
