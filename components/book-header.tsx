'use client';

import { ArrowLeft } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
            title="Back to library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="h-6 w-px bg-gray-200" />
          
          <Logo size="sm" />
          
          <div className="h-6 w-px bg-gray-200" />
          
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
            <p className="text-xs text-gray-500">{pageCount} pages</p>
          </div>

          {/* Progress */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">Progress</p>
              <p className="text-sm font-semibold text-gray-900">{Math.round(progress)}%</p>
            </div>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
