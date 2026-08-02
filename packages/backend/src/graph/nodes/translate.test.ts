import { describe, it, expect } from 'vitest';
import { translateNode } from './translate';
import { GraphState } from '../state';

function baseState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    input: 'irrelevant',
    rawOutput: undefined,
    structuredQuery: undefined,
    validationErrors: [],
    url: undefined,
    error: undefined,
    ...overrides,
  };
}

describe('translateNode', () => {
  it('is a no-op when an earlier node already errored', () => {
    const result = translateNode(baseState({ error: 'boom' }));
    expect(result).toEqual({});
  });

  it('is a no-op when there is no structuredQuery yet', () => {
    const result = translateNode(baseState());
    expect(result).toEqual({});
  });

  it('produces a URL for a validated structured query', () => {
    const result = translateNode(
      baseState({
        structuredQuery: {
          filters: [{ field: 'City', operator: 'eq', value: 'Gatineau' }],
          orderBy: [],
          pagination: {},
          unsupported: [],
        },
      }),
    );
    expect(result.url).toBeDefined();
    expect(result.url).toContain('$filter');
    expect(result.error).toBeUndefined();
  });
});
