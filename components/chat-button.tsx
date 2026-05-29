'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { AIChatPanel } from './ai-chat-panel';

interface ChatButtonProps {
  pdfId: string;
  pdfTitle: string;
  pdfContent: string;
}

export function ChatButton({ pdfId, pdfTitle, pdfContent }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-40"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {isHovered && !isOpen && (
        <div className="fixed bottom-24 right-6 bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm font-medium text-foreground z-40">
          Ask AI about this paper
        </div>
      )}

      <AIChatPanel
        pdfId={pdfId}
        pdfTitle={pdfTitle}
        pdfContent={pdfContent}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
