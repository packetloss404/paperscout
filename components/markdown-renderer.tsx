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
        prose-headings:font-semibold prose-headings:text-foreground
        prose-p:text-foreground prose-p:leading-relaxed
        prose-a:text-primary prose-a:hover:underline
        prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-muted prose-pre:border prose-pre:border-border
        prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
        prose-strong:font-semibold prose-strong:text-foreground
        prose-em:italic
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
            <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-bold mt-5 mb-2" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="my-4 leading-relaxed" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="my-2 ml-6" {...props} />
          ),
          code: ({ node, inline, ...props }) => (
            <code
              className={inline ? 'bg-muted px-1.5 py-0.5 rounded' : ''}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
