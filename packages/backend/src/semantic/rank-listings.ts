import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { cosineSimilarity } from './cosine-similarity';

export interface RankedListing {
  rank: number;
  score: number | null;
  listing: unknown;
}

/**
 * Parses a DDF OData response body and returns its listings array
 * (the "value" property), or null if the body isn't parseable JSON or
 * doesn't have that shape — covers malformed bodies, error payloads, and
 * any non-listings response.
 */
export function extractListings(body: string): unknown[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const value = (parsed as { value?: unknown }).value;
  return Array.isArray(value) ? value : null;
}

/**
 * Real DDF text (PublicRemarks especially) sometimes carries raw C0
 * control bytes as encoding artifacts — e.g. curly quotes mangled into
 * \x1C/\x1D (File/Group Separator) observed in live DDF QA data. These
 * aren't valid content and have caused the local embedding server to
 * return a bare 500 with no useful error body, so they're stripped before
 * anything gets sent to the embeddings API rather than trusting
 * third-party text to be clean.
 */
function sanitizeForEmbedding(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function getPublicRemarks(listing: unknown): string | undefined {
  if (typeof listing !== 'object' || listing === null) return undefined;
  const remarks = (listing as { PublicRemarks?: unknown }).PublicRemarks;
  if (typeof remarks !== 'string') return undefined;
  const sanitized = sanitizeForEmbedding(remarks);
  return sanitized.length > 0 ? sanitized : undefined;
}

/**
 * Re-ranks listings by how closely their PublicRemarks text semantically
 * matches the prompt. Listings with no usable PublicRemarks are appended
 * at the end, in their original order, with score: null.
 */
export async function rankByPublicRemarks(
  prompt: string,
  listings: unknown[],
  embeddings: EmbeddingsInterface,
): Promise<RankedListing[]> {
  const withRemarks: { listing: unknown; remarks: string }[] = [];
  const withoutRemarks: unknown[] = [];

  for (const listing of listings) {
    const remarks = getPublicRemarks(listing);
    if (remarks) {
      withRemarks.push({ listing, remarks });
    } else {
      withoutRemarks.push(listing);
    }
  }

  let scored: { listing: unknown; score: number }[] = [];

  if (withRemarks.length > 0) {
    // Sequential, not Promise.all: two concurrent requests to a not-yet-
    // warm local embedding model (LM Studio loads it on first use) has
    // been observed to crash the server outright — see embeddings.ts.
    // Sequencing them means at most one request ever hits a cold model.
    const queryEmbedding = await embeddings.embedQuery(sanitizeForEmbedding(prompt));
    const remarkEmbeddings = await embeddings.embedDocuments(withRemarks.map((r) => r.remarks));

    scored = withRemarks
      .map(({ listing }, i) => ({ listing, score: cosineSimilarity(queryEmbedding, remarkEmbeddings[i]) }))
      .sort((a, b) => b.score - a.score);
  }

  const ranked: RankedListing[] = [
    ...scored.map((s) => ({ score: s.score, listing: s.listing })),
    ...withoutRemarks.map((listing) => ({ score: null, listing })),
  ].map((entry, i) => ({ rank: i + 1, ...entry }));

  return ranked;
}
