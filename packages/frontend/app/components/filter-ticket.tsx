'use client';

import type { DdfStructuredQuery } from '@ddf/shared';

const OPERATOR_LABEL: Record<string, string> = {
  eq: 'is',
  gt: 'more than',
  gte: 'at least',
  lt: 'less than',
  lte: 'at most',
  contains: 'contains',
};

function formatValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return value.toLocaleString('en-CA');
  return value;
}

export function FilterTicket({ query }: { query: DdfStructuredQuery }) {
  const hasFilters = query.filters.length > 0;
  const hasOrder = query.orderBy.length > 0;
  const hasUnsupported = query.unsupported.length > 0;

  return (
    <div className="border border-ink-600/40 bg-paper text-ink-950 rounded-sm shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-dashed border-ink-600/40">
        <span className="font-display text-lg tracking-wide">Query Ticket</span>
        <span className="font-mono text-xs text-ink-600">
          {query.filters.length} filter{query.filters.length === 1 ? '' : 's'}
        </span>
      </div>

      {!hasFilters && (
        <p className="px-5 py-6 text-sm text-ink-600 italic">
          No filters extracted — the search will return an unfiltered listing set.
        </p>
      )}

      {hasFilters && (
        <ul>
          {query.filters.map((f, i) => (
            <li key={`${f.field}-${i}`}>
              <div className="flex items-baseline gap-2 px-5 py-3 text-sm">
                <span className="font-mono uppercase tracking-wide text-ink-600 w-40 shrink-0">
                  {f.field}
                </span>
                <span className="text-ink-400">{OPERATOR_LABEL[f.operator] ?? f.operator}</span>
                <span className="font-semibold ml-auto">{formatValue(f.value)}</span>
              </div>
              {i < query.filters.length - 1 && <div className="tear mx-5" />}
            </li>
          ))}
        </ul>
      )}

      {hasOrder && (
        <div className="px-5 py-3 border-t border-dashed border-ink-600/40 text-sm">
          <span className="font-mono uppercase tracking-wide text-ink-600 mr-2">Sorted by</span>
          {query.orderBy.map((o) => `${o.field} (${o.direction})`).join(', ')}
        </div>
      )}

      {hasUnsupported && (
        <div className="px-5 py-4 border-t border-dashed border-rust-500/50 bg-rust-500/5">
          <div className="stamp inline-block border-2 border-rust-500 text-rust-500 font-display uppercase text-xs tracking-widest px-2 py-1 rotate-[-8deg] mb-2">
            Not mapped
          </div>
          <ul className="space-y-1">
            {query.unsupported.map((u, i) => (
              <li key={i} className="text-sm text-ink-600">
                &ldquo;{u}&rdquo; — no matching field, ignored.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
