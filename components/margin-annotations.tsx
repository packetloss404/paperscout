'use client';

import { Annotation } from '@/lib/db';
import { X } from 'lucide-react';
import { useState } from 'react';

interface MarginAnnotationsProps {
  annotations: Annotation[];
  onAddAnnotation: (text: string, type: 'highlight' | 'annotation') => void;
  onDeleteAnnotation: (id: string) => void;
  paragraphIndex: number;
}

export function MarginAnnotations({
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  paragraphIndex,
}: MarginAnnotationsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [annotationText, setAnnotationText] = useState('');

  const handleAddAnnotation = () => {
    if (annotationText.trim()) {
      onAddAnnotation(annotationText, 'annotation');
      setAnnotationText('');
      setIsAdding(false);
    }
  };

  const paragraphAnnotations = annotations.filter(
    (a) => a.paragraphIndex === paragraphIndex
  );

  if (paragraphAnnotations.length === 0 && !isAdding) {
    return null;
  }

  return (
    <div className="ml-4 pl-5 border-l-2 border-primary/30 hover:border-primary/50 transition-colors space-y-3">
      {paragraphAnnotations.map((annotation) => (
        <div
          key={annotation.id}
          className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground flex items-start justify-between gap-3 group hover:border-primary/40 hover:shadow-sm transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary/70 mb-2 uppercase tracking-wide">
              {annotation.type === 'highlight' ? '📌 Highlight' : '💬 Note'}
            </p>
            <p className="text-foreground/90 leading-relaxed break-words">{annotation.text}</p>
          </div>
          <button
            onClick={() => onDeleteAnnotation(annotation.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/10 rounded flex-shrink-0"
            title="Delete note"
          >
            <X className="w-4 h-4 text-destructive/60" />
          </button>
        </div>
      ))}

      {isAdding && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-lg p-4 space-y-3">
          <textarea
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-background border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddAnnotation}
              className="flex-1 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-md"
            >
              Save Note
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setAnnotationText('');
              }}
              className="flex-1 bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="text-sm font-semibold text-primary hover:text-accent transition-colors opacity-60 hover:opacity-100"
        >
          + Add note
        </button>
      )}
    </div>
  );
}
