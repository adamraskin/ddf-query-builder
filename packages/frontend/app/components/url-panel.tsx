'use client';

import { useState } from 'react';
import { runGeneratedUrl, type RankedListing } from '@/lib/api-client';
import { RankedResults } from './ranked-results';

type RunResult =
  | {
      type: 'success';
      status: number;
      contentType: string | null;
      body: string;
      ranked?: RankedListing[];
      rankingUnavailable?: string;
    }
  | { type: 'error'; message: string };

function formatBody(body: string, contentType: string | null): string {
  if (contentType?.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // Not actually valid JSON despite the content-type — fall through to raw text.
    }
  }
  return body;
}

export function UrlPanel({ url, prompt }: { url: string; prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

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
    setRunResult(null);

    const response = await runGeneratedUrl(url, prompt);

    if (response.ok) {
      setRunResult({
        type: 'success',
        status: response.data.status,
        contentType: response.data.contentType,
        body: response.data.body,
        ranked: response.data.ranked,
        rankingUnavailable: response.data.rankingUnavailable,
      });
    } else {
      setRunResult({ type: 'error', message: response.error.message });
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

        {runResult?.type === 'error' && (
          <p className="text-sm text-rust-500">{runResult.message}</p>
        )}

        {runResult?.type === 'success' && (
          <div className="flex flex-col gap-1">
            <p
              className={`text-xs font-mono uppercase tracking-wide ${
                runResult.status >= 200 && runResult.status < 300 ? 'text-sage-500' : 'text-rust-500'
              }`}
            >
              Status {runResult.status}
              {runResult.contentType ? ` · ${runResult.contentType}` : ''}
            </p>
            <pre className="max-h-96 overflow-auto bg-ink-950/60 border border-ink-600/40 rounded-sm px-4 py-3 text-xs font-mono whitespace-pre-wrap break-all text-paper-dim">
              {formatBody(runResult.body, runResult.contentType) || '(empty response body)'}
            </pre>

            {runResult.ranked && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="font-mono text-xs uppercase tracking-wide text-ink-600">
                  Ranked by relevance to your prompt
                </span>
                <RankedResults ranked={runResult.ranked} />
              </div>
            )}
            {runResult.rankingUnavailable && (
              <p className="text-xs text-ink-600 italic mt-1">
                Semantic ranking skipped: {runResult.rankingUnavailable}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
