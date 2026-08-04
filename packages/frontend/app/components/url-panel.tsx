'use client';

import { useState } from 'react';
import { runGeneratedUrl } from '@/lib/api-client';

export function UrlPanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
    details?: string;
    contentType?: string | null;
  } | null>(null);

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
        details: response.data.body || '(empty response body)',
        contentType: response.data.contentType,
      });
    } else {
      const details =
        typeof response.error.details === 'string'
          ? response.error.details
          : JSON.stringify(response.error.details, null, 2);

      setRunStatus({
        type: 'error',
        message: response.error.message,
        details,
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
          <div className="space-y-2">
            <p className={`text-sm ${runStatus.type === 'error' ? 'text-rust-500' : 'text-paper-dim'}`}>
              {runStatus.message}
            </p>
            {runStatus.contentType && (
              <p className="text-xs font-mono uppercase tracking-wide text-ink-400">
                {runStatus.contentType}
              </p>
            )}
            {runStatus.details !== undefined && (
              <pre className="max-h-80 overflow-auto rounded-sm border border-ink-600/30 bg-ink-950/80 p-3 text-xs font-mono whitespace-pre-wrap break-all text-paper-dim">
                {runStatus.details}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
