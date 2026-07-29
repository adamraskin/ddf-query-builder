import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder';
import { DDF_FIELDS, DDF_OPERATORS } from './ddf-metadata';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('mentions every field key from the metadata registry (no drift)', () => {
    for (const field of DDF_FIELDS) {
      expect(prompt).toContain(`"${field.key}"`);
    }
  });

  it('mentions every operator', () => {
    for (const op of DDF_OPERATORS) {
      expect(prompt).toContain(op);
    }
  });

  it('instructs the model to return JSON only, no prose', () => {
    expect(prompt.toLowerCase()).toContain('only a single json object');
  });

  it('instructs the model not to invent unsupported fields', () => {
    expect(prompt.toLowerCase()).toContain('unsupported');
  });
});

describe('buildUserPrompt', () => {
  it('trims whitespace', () => {
    expect(buildUserPrompt('  3 bedroom houses in Ottawa  ')).toBe('3 bedroom houses in Ottawa');
  });
});
