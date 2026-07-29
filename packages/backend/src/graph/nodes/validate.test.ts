import { describe, it, expect } from 'vitest';
import { validateNode } from './validate';
import { GraphState } from '../state';

function stateWith(rawOutput: unknown): GraphState {
  return {
    input: 'irrelevant for this test',
    rawOutput,
    structuredQuery: undefined,
    validationErrors: [],
    url: undefined,
    error: undefined,
  };
}

describe('validateNode', () => {
  it('passes through a well-formed extraction', () => {
    const result = validateNode(
      stateWith({
        filters: [{ field: 'City', operator: 'eq', value: 'Ottawa' }],
        orderBy: [],
        pagination: {},
        unsupported: [],
      }),
    );
    expect(result.error).toBeUndefined();
    expect(result.structuredQuery?.filters).toHaveLength(1);
  });

  it('rejects a hallucinated field the model invented', () => {
    const result = validateNode(
      stateWith({
        filters: [{ field: 'SchoolDistrictRating', operator: 'eq', value: 'A+' }],
        orderBy: [],
        pagination: {},
        unsupported: [],
      }),
    );
    expect(result.error).toBeDefined();
    expect(result.validationErrors?.length).toBeGreaterThan(0);
  });

  it('rejects an operator invalid for the given field', () => {
    const result = validateNode(
      stateWith({
        filters: [{ field: 'PropertyType', operator: 'gt', value: 'Residential' }],
        orderBy: [],
        pagination: {},
        unsupported: [],
      }),
    );
    expect(result.error).toBeDefined();
  });

  it('rejects a value with the wrong type', () => {
    const result = validateNode(
      stateWith({
        filters: [{ field: 'ListPrice', operator: 'lt', value: 'five hundred thousand' }],
        orderBy: [],
        pagination: {},
        unsupported: [],
      }),
    );
    expect(result.error).toBeDefined();
  });

  it('is a no-op if an earlier node already set an error', () => {
    const state = stateWith(undefined);
    state.error = 'extract already failed';
    const result = validateNode(state);
    expect(result).toEqual({});
  });

  it('handles completely malformed rawOutput without throwing', () => {
    const result = validateNode(stateWith('not even an object'));
    expect(result.error).toBeDefined();
  });
});
