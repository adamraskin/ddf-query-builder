'use client';

import { useState } from 'react';
import { runGeneratedUrl } from '@/lib/api-client';

export function UrlPanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string } | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently ignore.
    }
  }

  async function handleRunUrl() {
    setRunning(true);
    setRunStatus(null);

    const response = await runGeneratedUrl(url);

    if (response.ok) {
      setRunStatus({
        type: 'success',
        message: `Request completed with status ${response.data.status}.`,
      });
    } else {
      setRunStatus({
        type: 'error',
        message: response.error.message,
      });
    }

    setRunning(false);
  }

  return (
    <div className="border border-ink-600/40 bg-ink-800 rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-600/40">
        <span className="font-display text-lg tracking-wide">Generated DDF URL</span>
        <button
          onClick={handleCopy}
          className="text-xs font-mono uppercase tracking-wide border border-brass-500 text-brass-500 px-3 py-1 rounded-sm hover:bg-brass-500 hover:text-ink-950 transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-5 py-4 text-sm font-mono whitespace-pre-wrap break-all text-paper-dim">
        {url}
      </pre>
      <div className="border-t border-ink-600/40 px-5 py-3 flex flex-col gap-2">
        <button
          onClick={handleRunUrl}
          disabled={running}
          className="w-fit text-xs font-mono uppercase tracking-wide border border-brass-500 text-brass-500 px-3 py-1 rounded-sm hover:bg-brass-500 hover:text-ink-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? 'Running…' : 'Run URL'}
        </button>
        {runStatus && (
          <p className={`text-sm ${runStatus.type === 'error' ? 'text-rust-500' : 'text-paper-dim'}`}>
            {runStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
