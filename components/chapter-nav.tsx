'use client';

import { Chapter } from '@/lib/db';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface ChapterNavProps {
  chapters: Chapter[];
  onSelectChapter: (chapter: Chapter) => void;
  isCollapsed: boolean;
}

export function ChapterNav({ chapters, onSelectChapter, isCollapsed }: ChapterNavProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(chapters.map((c) => c.id))
  );

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderChapter = (chapter: Chapter, depth: number = 0) => {
    const isExpanded = expandedIds.has(chapter.id);
    const hasChildren = chapter.children && chapter.children.length > 0;

    return (
      <div key={chapter.id}>
        <button
          onClick={() => {
            onSelectChapter(chapter);
            if (hasChildren) {
              toggleExpanded(chapter.id);
            }
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-muted transition-colors text-left group"
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4 flex-shrink-0" />}
          <span className="truncate text-foreground group-hover:text-primary">
            {chapter.title}
          </span>
        </button>

        {hasChildren && isExpanded && (
          <div>
            {chapter.children!.map((child) =>
              renderChapter(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={`flex flex-col gap-1 ${isCollapsed ? 'hidden' : ''}`}>
      {chapters.map((chapter) => renderChapter(chapter))}
    </nav>
  );
}
