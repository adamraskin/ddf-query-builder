import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphState } from '../state';

// Mock the LM Studio client module before importing the node that uses it.
const invokeMock = vi.fn();
const withStructuredOutputMock = vi.fn(() => ({ invoke: invokeMock }));

vi.mock('../../llm/client', () => ({
  createLmStudioClient: vi.fn(() => ({
    withStructuredOutput: withStructuredOutputMock,
  })),
}));

// Imported after the mock so it picks up the mocked module.
const { extractNode } = await import('./extract');

function baseState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    input: '3 bedroom houses in Ottawa',
    rawOutput: undefined,
    structuredQuery: undefined,
    validationErrors: [],
    url: undefined,
    error: undefined,
    ...overrides,
  };
}

describe('extractNode', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('rejects an empty query before calling the model', async () => {
    const result = await extractNode(baseState({ input: '   ' }));
    expect(result.error).toBeDefined();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('returns rawOutput on a successful structured response', async () => {
    invokeMock.mockResolvedValue({
      filters: [{ field: 'City', operator: 'eq', value: 'Ottawa' }],
      orderBy: [],
      pagination: {},
      unsupported: [],
    });

    const result = await extractNode(baseState());
    expect(result.error).toBeUndefined();
    expect(result.rawOutput).toBeDefined();
  });

  it('handles the model throwing (e.g. invalid JSON) without throwing itself', async () => {
    invokeMock.mockRejectedValue(new Error('Unexpected token in JSON'));

    const result = await extractNode(baseState());
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to extract');
  });

  it('handles an empty/null response from the model', async () => {
    invokeMock.mockResolvedValue(null);

    const result = await extractNode(baseState());
    expect(result.error).toBeDefined();
  });
});
