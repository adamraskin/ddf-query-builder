'use client';

import { useState } from 'react';
import { submitQuery, type QueryResponse } from '@/lib/api-client';
import { FilterTicket } from './filter-ticket';
import { UrlPanel } from './url-panel';

const EXAMPLE_PROMPTS = [
  '3 bedroom houses in Ottawa under 500k',
  'waterfront condos with a pool, cheapest first',
  'homes in Gatineau with at least 2 bathrooms and a garage',
];

type Status = 'idle' | 'loading' | 'success' | 'error';

export function QueryBuilder() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<QueryResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || status === 'loading') return;
    setStatus('loading');
    setResult(null);
    const response = await submitQuery(prompt);
    setResult(response);
    setStatus(response.ok ? 'success' : 'error');
  }

  return (
    <main className="min-h-screen bg-grid bg-[length:28px_28px]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-500 mb-3">
            DDF · Natural Language Query Builder
          </p>
          <h1 className="font-display text-4xl leading-tight mb-3">
            Describe the listing(s) you want.
            <br />
            We&apos;ll draft the instrument.
          </h1>
          <p className="text-ink-400 max-w-xl">
            Type a search the way you&apos;d say it out loud. It comes back as a structured
            filter set and a ready-to-use DDF OData URL.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mb-4">
          <label htmlFor="prompt" className="sr-only">
            Describe the property you&apos;re looking for
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 3 bedroom houses in Ottawa under 500k"
            rows={4}
            className="w-full resize-none bg-paper text-ink-950 placeholder:text-ink-600/60 rounded-sm border border-ink-600/40 px-5 py-4 font-body text-lg focus:outline-none focus:ring-2 focus:ring-brass-500"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  type="button"
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="text-xs font-mono text-ink-400 border border-ink-600/40 rounded-full px-3 py-1 hover:border-brass-500 hover:text-brass-500 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={status === 'loading' || !prompt.trim()}
              className="font-display uppercase tracking-wide bg-brass-500 text-ink-950 px-6 py-3 rounded-sm hover:bg-brass-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 ml-4"
            >
              {status === 'loading' ? 'Drafting…' : 'Build query'}
            </button>
          </div>
        </form>

        <section className="mt-10 space-y-5" aria-live="polite">
          {status === 'loading' && (
            <div className="text-ink-400 font-mono text-sm animate-pulse">
              Sending to the model and validating the response…
            </div>
          )}

          {status === 'error' && result && !result.ok && (
            <div className="border border-rust-500/60 bg-rust-500/10 rounded-sm px-5 py-4">
              <p className="font-display text-rust-500 mb-1">
                Couldn&apos;t build a query from that.
              </p>
              <p className="text-sm text-ink-400">{result.error.message}</p>
              {result.error.details !== undefined && (
                <pre className="mt-3 max-h-80 overflow-auto rounded-sm border border-rust-500/20 bg-ink-950/80 p-3 text-xs font-mono whitespace-pre-wrap break-all text-paper-dim">
                  {typeof result.error.details === 'string'
                    ? result.error.details
                    : JSON.stringify(result.error.details, null, 2)}
                </pre>
              )}
            </div>
          )}

          {status === 'success' && result && result.ok && (
            <>
              <FilterTicket query={result.data.query} />
              <UrlPanel url={result.data.url} prompt={prompt} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
