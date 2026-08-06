'use client';

import type { RankedListing } from '@/lib/api-client';

interface Listing {
  City?: string;
  ListPrice?: number;
  PublicRemarks?: string;
}

function formatScore(score: number | null): string {
  if (score === null) return 'no remarks available';
  return `${(score * 100).toFixed(1)}% match`;
}

function summaryLine(listing: unknown): string {
  const { City, ListPrice } = (listing ?? {}) as Listing;
  const parts = [City, typeof ListPrice === 'number' ? `$${ListPrice.toLocaleString('en-CA')}` : undefined].filter(
    Boolean,
  );
  return parts.join(' · ') || 'Listing';
}

function remarksSnippet(listing: unknown): string | null {
  const { PublicRemarks } = (listing ?? {}) as Listing;
  if (!PublicRemarks) return null;
  return PublicRemarks.length > 220 ? `${PublicRemarks.slice(0, 220)}…` : PublicRemarks;
}

export function RankedResults({ ranked }: { ranked: RankedListing[] }) {
  if (ranked.length === 0) {
    return <p className="text-sm text-ink-400 italic">No listings in the response to rank.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {ranked.map((entry) => (
        <li
          key={entry.rank}
          className="border border-ink-600/40 bg-ink-950/40 rounded-sm px-4 py-3 flex flex-col gap-1"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-xs text-brass-500">
              #{entry.rank} <span className="text-paper-dim">{summaryLine(entry.listing)}</span>
            </span>
            <span
              className={`font-mono text-xs uppercase tracking-wide shrink-0 ${
                entry.score === null ? 'text-ink-600' : 'text-sage-500'
              }`}
            >
              {formatScore(entry.score)}
            </span>
          </div>
          {remarksSnippet(entry.listing) && (
            <p className="text-xs text-ink-400">{remarksSnippet(entry.listing)}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
