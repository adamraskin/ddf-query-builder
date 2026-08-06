import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './cosine-similarity';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });

  it('returns 0 for a zero-magnitude vector instead of NaN', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it('is not affected by vector magnitude, only direction', () => {
    const a = cosineSimilarity([1, 1], [2, 2]);
    const b = cosineSimilarity([1, 1], [200, 200]);
    expect(a).toBeCloseTo(1);
    expect(b).toBeCloseTo(1);
  });
});
