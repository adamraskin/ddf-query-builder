import { describe, it, expect, vi } from 'vitest';
import { extractListings, rankByPublicRemarks } from './rank-listings';

describe('extractListings', () => {
  it('returns the value array from a valid OData response', () => {
    const body = JSON.stringify({ '@odata.context': 'x', value: [{ ListingKey: '1' }, { ListingKey: '2' }] });
    expect(extractListings(body)).toEqual([{ ListingKey: '1' }, { ListingKey: '2' }]);
  });

  it('returns null for malformed JSON', () => {
    expect(extractListings('{not json')).toBeNull();
  });

  it('returns null when value is missing', () => {
    expect(extractListings(JSON.stringify({ '@odata.context': 'x' }))).toBeNull();
  });

  it('returns null when value is not an array', () => {
    expect(extractListings(JSON.stringify({ value: 'oops' }))).toBeNull();
  });

  it('returns null for a JSON body that is not an object (e.g. an error string)', () => {
    expect(extractListings('"some error"')).toBeNull();
    expect(extractListings('null')).toBeNull();
  });
});

describe('rankByPublicRemarks', () => {
  function fakeEmbeddings(vectorFor: Record<string, number[]>) {
    return {
      embedQuery: vi.fn(async (text: string) => vectorFor[text]),
      embedDocuments: vi.fn(async (texts: string[]) => texts.map((t) => vectorFor[t])),
    };
  }

  it('sorts listings by similarity to the prompt, highest first', async () => {
    const listings = [
      { ListingKey: 'far', PublicRemarks: 'far text' },
      { ListingKey: 'close', PublicRemarks: 'close text' },
    ];
    const embeddings = fakeEmbeddings({
      'quiet street': [1, 0],
      'far text': [0, 1],
      'close text': [0.9, 0.1],
    });

    const ranked = await rankByPublicRemarks('quiet street', listings, embeddings);

    expect(ranked.map((r) => (r.listing as { ListingKey: string }).ListingKey)).toEqual(['close', 'far']);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score!);
  });

  it('places listings with no PublicRemarks at the end with score: null, preserving their order', async () => {
    const listings = [
      { ListingKey: 'no-remarks-1' },
      { ListingKey: 'has-remarks', PublicRemarks: 'text' },
      { ListingKey: 'no-remarks-2', PublicRemarks: '   ' }, // whitespace-only counts as none
    ];
    const embeddings = fakeEmbeddings({
      prompt: [1, 0],
      text: [1, 0],
    });

    const ranked = await rankByPublicRemarks('prompt', listings, embeddings);

    expect(ranked.map((r) => (r.listing as { ListingKey: string }).ListingKey)).toEqual([
      'has-remarks',
      'no-remarks-1',
      'no-remarks-2',
    ]);
    expect(ranked[0].score).not.toBeNull();
    expect(ranked[1].score).toBeNull();
    expect(ranked[2].score).toBeNull();
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('handles an empty listings array', async () => {
    const embeddings = fakeEmbeddings({});
    const ranked = await rankByPublicRemarks('prompt', [], embeddings);
    expect(ranked).toEqual([]);
    expect(embeddings.embedQuery).not.toHaveBeenCalled();
  });

  it('does not call embeddings at all when no listing has PublicRemarks', async () => {
    const embeddings = fakeEmbeddings({});
    const ranked = await rankByPublicRemarks('prompt', [{ ListingKey: '1' }], embeddings);
    expect(ranked).toEqual([{ rank: 1, score: null, listing: { ListingKey: '1' } }]);
    expect(embeddings.embedQuery).not.toHaveBeenCalled();
    expect(embeddings.embedDocuments).not.toHaveBeenCalled();
  });
});
