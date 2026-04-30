'use client';

import { ArrowLeft, BookMarked, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo } from './logo';

interface BookHeaderProps {
  title: string;
  pageCount: number;
  currentChapterIndex: number;
  totalChapters: number;
}

export function BookHeader({
  title,
  pageCount,
  currentChapterIndex,
  totalChapters,
}: BookHeaderProps) {
  const router = useRouter();
  const progress = ((currentChapterIndex + 1) / totalChapters) * 100;

  return (
    <header className="sticky top-0 z-30 border-b border-stone-800/10 bg-[#17120c]/95 text-white shadow-[0_12px_40px_rgba(23,18,12,0.18)] backdrop-blur-xl">
      <div className="px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-stone-300 transition-colors hover:bg-white/10 hover:text-white rounded-lg"
            title="Back to library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="h-7 w-px bg-white/15" />
          
          <div className="rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
            <Logo size="sm" />
          </div>
          
          <div className="h-7 w-px bg-white/15" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">
                <Sparkles className="h-3 w-3" /> AI Research Brief
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-xs text-stone-400">
                <BookMarked className="h-3.5 w-3.5" /> {pageCount} source pages
              </span>
            </div>
            <h1 className="mt-1 truncate text-sm font-semibold text-white">{title}</h1>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Chapter</p>
              <p className="text-sm font-semibold text-white">{currentChapterIndex + 1}/{totalChapters}</p>
            </div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
