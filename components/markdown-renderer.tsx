'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  onSelectText?: (text: string, index: number) => void;
}

export function MarkdownRenderer({
  content,
  onSelectText,
}: MarkdownRendererProps) {
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedText = selection.toString();
      onSelectText?.(selectedText, 0);
    }
  };

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert
        prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-4
        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
        prose-p:text-foreground prose-p:leading-relaxed
        prose-a:text-primary prose-a:hover:underline prose-a:font-medium
        prose-code:bg-muted prose-code:text-foreground prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
        prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:overflow-x-auto
        prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:italic
        prose-strong:font-semibold prose-strong:text-foreground
        prose-em:italic prose-em:text-foreground
        prose-ol:list-decimal prose-ol:list-inside prose-ol:space-y-2
        prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-2
        prose-li:text-foreground
        prose-hr:border-border prose-hr:my-8
        [&_.math-display]:overflow-x-auto [&_.math-display]:my-4
        [&_.math-inline]:mx-1
      "
      onMouseUp={handleTextSelection}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mt-10 mb-5 text-balance" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mt-8 mb-4 text-balance" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold mt-6 mb-3" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="my-5 leading-relaxed text-foreground/90" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="my-2 ml-6 text-foreground/90" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 my-4" {...props} />
          ),
          code: ({ node, inline, ...props }) => (
            <code
              className={inline ? 'bg-muted px-2 py-1 rounded text-sm font-mono text-primary' : 'font-mono'}
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 my-6 italic text-muted-foreground" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
