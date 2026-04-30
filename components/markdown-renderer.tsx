'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  onSelectText?: (text: string, index: number) => void;
}

export function MarkdownRenderer({ content, onSelectText }: MarkdownRendererProps) {
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      onSelectText?.(selection.toString(), 0);
    }
  };

  return (
    <div
      className="paperdrive-markdown max-w-none text-stone-900 [&_.katex-display]:my-8 [&_.katex-display]:overflow-x-auto [&_.katex-display]:rounded-2xl [&_.katex-display]:border [&_.katex-display]:border-amber-200 [&_.katex-display]:bg-amber-50/70 [&_.katex-display]:px-6 [&_.katex-display]:py-5"
      onMouseUp={handleTextSelection}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="mb-8 mt-2 max-w-3xl text-balance font-serif text-4xl font-black leading-tight tracking-tight text-stone-950 md:text-5xl"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="group relative mb-5 mt-14 border-t border-stone-200 pt-8 text-2xl font-black tracking-tight text-stone-950 md:text-3xl"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mb-3 mt-8 text-xl font-bold text-stone-900" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p
              className="my-6 max-w-3xl font-serif text-[18px] leading-9 text-stone-800 md:text-[19px]"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="my-6 max-w-3xl space-y-3 rounded-2xl border border-stone-200 bg-white/60 p-5 shadow-sm" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-6 max-w-3xl list-decimal space-y-3 rounded-2xl border border-stone-200 bg-white/60 p-5 pl-10 shadow-sm" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="pl-1 text-[15px] leading-7 text-stone-800 marker:text-amber-600" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-black text-stone-950" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="text-stone-700" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-8 max-w-3xl overflow-hidden rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-0 shadow-[0_18px_50px_rgba(146,64,14,0.12)]">
              <div className="border-b border-amber-200/70 bg-amber-100/70 px-5 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-amber-900">
                Analyst Note
              </div>
              <div className="px-6 py-5 font-serif text-lg leading-8 text-stone-800" {...props} />
            </blockquote>
          ),
          code: ({ node, inline, ...props }) => (
            <code
              className={
                inline
                  ? 'rounded-md bg-stone-900 px-1.5 py-0.5 font-mono text-sm text-amber-100'
                  : 'font-mono text-sm text-amber-100'
              }
              {...props}
            />
          ),
          pre: ({ node, ...props }) => (
            <pre className="my-8 max-w-3xl overflow-x-auto rounded-2xl border border-stone-800 bg-stone-950 p-5 shadow-xl" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-8 max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border-b border-stone-200 bg-stone-100 px-4 py-3 font-bold text-stone-900" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border-b border-stone-100 px-4 py-3 leading-6 text-stone-700" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-12 max-w-3xl border-0 border-t border-stone-200" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="font-semibold text-indigo-700 underline decoration-indigo-200 decoration-2 underline-offset-4 hover:text-indigo-900" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
