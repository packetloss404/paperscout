'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface Annotation {
  id: string;
  paragraphIndex: number;
  type: 'highlight' | 'annotation';
  text: string;
}

interface MarginAnnotationPopoverProps {
  paragraphIndex: number;
  onAddAnnotation: (type: 'highlight' | 'annotation', text: string) => void;
  onClose: () => void;
  existingAnnotations: Annotation[];
}

export function MarginAnnotationPopover({
  paragraphIndex,
  onAddAnnotation,
  onClose,
  existingAnnotations,
}: MarginAnnotationPopoverProps) {
  const [mode, setMode] = useState<'menu' | 'input'>('menu');
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === 'input' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleSubmit = () => {
    if (text.trim()) {
      onAddAnnotation('annotation', text);
      setText('');
      onClose();
    }
  };

  const paragraphAnnotations = existingAnnotations.filter(
    (a) => a.paragraphIndex === paragraphIndex
  );

  if (mode === 'input') {
    return (
      <div className="w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Add note</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your note..."
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm"
          rows={3}
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="flex-1 px-3 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={() => {
              setText('');
              setMode('menu');
            }}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Actions</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Existing annotations for this paragraph */}
      {paragraphAnnotations.length > 0 && (
        <div className="space-y-2 pb-3 border-b border-gray-200">
          {paragraphAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className="text-xs p-2 bg-emerald-50 rounded border border-emerald-200 text-gray-700"
            >
              {annotation.text}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <button
        onClick={() => {
          onAddAnnotation('highlight', '');
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-900 rounded-lg hover:bg-yellow-100 transition-colors border border-yellow-200 text-sm font-medium"
      >
        <span>⭐</span> Highlight
      </button>
      <button
        onClick={() => setMode('input')}
        className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-950 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 text-sm font-medium"
      >
        <Plus className="w-4 h-4" /> Add note
      </button>
    </div>
  );
}

interface LeftMarginProps {
  selectedParagraphIndex: number | null;
  annotations: Annotation[];
  onAddAnnotation: (paragraphIndex: number, type: 'highlight' | 'annotation', text: string) => void;
  onDeleteAnnotation: (id: string) => void;
  contentRef: React.RefObject<HTMLDivElement>;
}

export function LeftMargin({
  selectedParagraphIndex,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  contentRef,
}: LeftMarginProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0 });

  const handleParagraphClick = (paragraphIndex: number) => {
    if (contentRef.current) {
      const paragraphs = contentRef.current.querySelectorAll('p');
      const paragraph = paragraphs[paragraphIndex];
      if (paragraph) {
        const rect = paragraph.getBoundingClientRect();
        setPopoverPos({ top: rect.top + window.scrollY - 50 });
        setShowPopover(true);
      }
    }
  };

  return (
    <div className="w-20 flex-shrink-0 relative">
      {/* Gutter for annotations */}
      {showPopover && selectedParagraphIndex !== null && (
        <div
          className="fixed z-40 left-6"
          style={{ top: `${popoverPos.top}px` }}
        >
          <MarginAnnotationPopover
            paragraphIndex={selectedParagraphIndex}
            onAddAnnotation={(type, text) => {
              if (selectedParagraphIndex !== null) {
                onAddAnnotation(selectedParagraphIndex, type, text);
              }
            }}
            onClose={() => setShowPopover(false)}
            existingAnnotations={annotations}
          />
        </div>
      )}

      {/* Annotation markers */}
      {annotations.length > 0 && (
        <div className="space-y-1 px-3 py-4">
          {annotations.map((annotation) => (
            <button
              key={annotation.id}
              title={annotation.text}
              className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-700 hover:bg-emerald-200 transition-colors group relative"
              onClick={() => {
                handleParagraphClick(annotation.paragraphIndex);
              }}
            >
              <span className="text-xs font-bold text-emerald-700">✓</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(annotation.id);
                }}
                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 bg-red-500 text-white rounded-full p-0.5" />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
