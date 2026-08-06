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

function getPublicRemarks(listing: unknown): string | undefined {
  if (typeof listing !== 'object' || listing === null) return undefined;
  const remarks = (listing as { PublicRemarks?: unknown }).PublicRemarks;
  return typeof remarks === 'string' && remarks.trim().length > 0 ? remarks : undefined;
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
    const [queryEmbedding, remarkEmbeddings] = await Promise.all([
      embeddings.embedQuery(prompt),
      embeddings.embedDocuments(withRemarks.map((r) => r.remarks)),
    ]);

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
