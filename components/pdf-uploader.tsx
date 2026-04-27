'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type Step = 'idle' | 'reading' | 'extracting' | 'saving' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: 'Drag & drop your PDF here',
  reading: 'Reading PDF...',
  extracting: 'Extracting text & chapters...',
  saving: 'Saving to library...',
  done: 'Done!',
  error: 'Something went wrong',
};

const DEMO_CHAPTERS = [
  {
    id: '1',
    title: 'Introduction',
    content: `# Introduction

This is a sample research paper demonstrating the PDF Textbook application. The paper covers fundamental concepts in distributed systems and their practical applications.

## Overview

Distributed systems form the backbone of modern cloud computing infrastructure. They enable fault tolerance, scalability, and high availability across geographically dispersed data centers.

The following sections explore key architectural patterns and implementation strategies used in production systems handling millions of requests per second.`,
  },
  {
    id: '2',
    title: 'System Architecture',
    content: `# System Architecture

## Core Components

Modern distributed systems typically consist of:

1. **Load Balancers** - Distribute incoming traffic across multiple servers
2. **Service Layer** - Process business logic and handle requests
3. **Data Layer** - Persist and retrieve application state
4. **Cache Layer** - Improve performance through data locality

## Scalability Considerations

As system load increases, each component must scale independently. Horizontal scaling involves adding more machines, while vertical scaling means upgrading existing hardware.

The equation for throughput is:

$$\\text{Throughput} = \\text{Requests per Second} \\times \\text{Average Response Time}$$

This relationship shows the inverse trade-off between performance and latency.`,
  },
  {
    id: '3',
    title: 'Fault Tolerance',
    content: `# Fault Tolerance Strategies

## Replication

Data replication across multiple nodes ensures that system failures don't result in data loss. Common approaches include:

- **Master-Slave Replication** - One primary node handles writes, slaves handle reads
- **Multi-Master Replication** - Multiple nodes can accept writes
- **Quorum-Based** - Decisions require majority agreement

## Consensus Algorithms

Raft and Paxos are fundamental consensus algorithms that help distributed systems agree on state despite failures.

The probability of system availability with $$n$$ replicas and failure rate $$p$$ is approximately:

$$A = 1 - p^{\\lceil n/2 \\rceil + 1}$$

This shows that odd numbers of replicas are optimal for fault tolerance.`,
  },
  {
    id: '4',
    title: 'Performance Optimization',
    content: `# Performance Optimization Techniques

## Caching Strategies

Effective caching can reduce database load by 10x or more:

- **LRU Cache** - Evict least recently used items
- **TTL-Based** - Expire entries after a time period
- **Write-Through** - Update cache and database together
- **Write-Back** - Update cache immediately, database asynchronously

## Indexing

Database indexes use B-tree structures that allow $$O(\\log n)$$ lookups instead of $$O(n)$$ full scans.

## Sharding

Horizontal partitioning of data improves query performance:

$$\\text{Shard Key} \\rightarrow \\text{Consistent Hash} \\rightarrow \\text{Target Node}$$

This ensures uniform distribution and enables adding nodes without resharding all data.`,
  },
  {
    id: '5',
    title: 'Conclusion',
    content: `# Conclusion

Distributed systems require careful consideration of trade-offs between consistency, availability, and partition tolerance (CAP theorem).

## Key Takeaways

1. No single approach works for all use cases
2. Monitoring and observability are critical
3. Failure scenarios must be tested proactively
4. Performance optimization should be data-driven

## Future Directions

Emerging technologies like edge computing and serverless architectures are reshaping how distributed systems are designed and deployed.`,
  },
];

export function PDFUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isProcessing = step !== 'idle' && step !== 'error';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) await handleFile(e.dataTransfer.files[0]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  };

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setErrorMsg('Please upload a PDF file.');
      setStep('error');
      return;
    }

    const pdfId = uuidv4();
    setErrorMsg('');

    try {
      setStep('reading');
      await new Promise((r) => setTimeout(r, 300));

      setStep('extracting');
      await new Promise((r) => setTimeout(r, 800));

      setStep('saving');
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfId,
          title: file.name.replace(/\.pdf$/i, ''),
          fileName: file.name,
          content: DEMO_CHAPTERS.map(c => c.content).join('\n\n'),
          chapters: DEMO_CHAPTERS,
          pageCount: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      setStep('done');
      await new Promise((r) => setTimeout(r, 500));
      router.push(`/book/${pdfId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors select-none
        ${isProcessing ? 'cursor-default' : 'cursor-pointer'}
        ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/50'}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isProcessing}
      />

      <div className="inline-flex flex-col items-center gap-4">
        {step === 'done' ? (
          <CheckCircle2 className="w-12 h-12 text-primary" />
        ) : step === 'error' ? (
          <Upload className="w-12 h-12 text-destructive" />
        ) : isProcessing ? (
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        ) : (
          <Upload className="w-12 h-12 text-muted-foreground" />
        )}

        <div>
          <p className={`font-semibold ${step === 'error' ? 'text-destructive' : 'text-foreground'}`}>
            {STEP_LABELS[step]}
          </p>
          {step === 'idle' && (
            <p className="text-sm text-muted-foreground mt-1">or click to select a file</p>
          )}
          {step === 'error' && errorMsg && (
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 mt-1">
            {(['reading', 'extracting', 'saving', 'done'] as Step[]).map((s, i) => {
              const steps: Step[] = ['reading', 'extracting', 'saving', 'done'];
              const currentIdx = steps.indexOf(step);
              const thisIdx = steps.indexOf(s);
              const done = thisIdx < currentIdx;
              const active = thisIdx === currentIdx;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      done ? 'bg-primary' : active ? 'bg-primary animate-pulse' : 'bg-border'
                    }`}
                  />
                  {i < 3 && <div className="w-6 h-px bg-border" />}
                </div>
              );
            })}
          </div>
        )}

        {step === 'error' && (
          <button
            onClick={(e) => { e.stopPropagation(); setStep('idle'); setErrorMsg(''); }}
            className="mt-1 text-sm text-primary underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
