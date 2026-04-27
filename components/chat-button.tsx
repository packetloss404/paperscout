'use client';

import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

interface ChatButtonProps {
  pdfId: string;
  onOpen: () => void;
}

export function ChatButton({ pdfId, onOpen }: ChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <button
        onClick={onOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {isHovered && (
        <div className="fixed bottom-24 right-6 bg-card border border-border rounded-lg shadow-lg p-3 text-sm text-foreground z-40 max-w-xs">
          Ask questions about this paper
        </div>
      )}
    </>
  );
}
