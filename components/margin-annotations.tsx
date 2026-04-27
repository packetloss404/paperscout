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
    <div className="ml-4 pl-4 border-l-2 border-primary/30 space-y-2">
      {paragraphAnnotations.map((annotation) => (
        <div
          key={annotation.id}
          className="bg-primary/5 rounded p-2 text-sm text-foreground flex items-start justify-between gap-2 group"
        >
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">
              {annotation.type === 'highlight' ? '📌 Highlight' : '💬 Note'}
            </p>
            <p className="text-sm">{annotation.text}</p>
          </div>
          <button
            onClick={() => onDeleteAnnotation(annotation.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/20 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {isAdding && (
        <div className="bg-primary/5 rounded p-2 space-y-2">
          <textarea
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Add a note..."
            className="w-full bg-background border border-border rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddAnnotation}
              className="flex-1 bg-primary text-primary-foreground rounded px-2 py-1 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setAnnotationText('');
              }}
              className="flex-1 bg-muted text-muted-foreground rounded px-2 py-1 text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs text-primary hover:underline transition-colors"
        >
          + Add note
        </button>
      )}
    </div>
  );
}
