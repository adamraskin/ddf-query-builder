import { describe, it, expect } from 'vitest';
import { DdfStructuredQuerySchema, DdfFilterSchema } from './ddf-schema';

describe('DdfStructuredQuerySchema', () => {
  it('accepts a well-formed query and fills in defaults', () => {
    const result = DdfStructuredQuerySchema.safeParse({
      filters: [{ field: 'City', operator: 'eq', value: 'Ottawa' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderBy).toEqual([]);
      expect(result.data.pagination).toEqual({});
      expect(result.data.unsupported).toEqual([]);
    }
  });

  it('rejects an unknown field (hallucination guard)', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'SwimmingPoolSize',
      operator: 'eq',
      value: 'large',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an operator not valid for the field', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'PropertyType',
      operator: 'gt',
      value: 'Residential',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a value of the wrong type for the field', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'BedroomsTotal',
      operator: 'gte',
      value: 'three',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a string value outside the allowed enum for PropertyType', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'PropertyType',
      operator: 'eq',
      value: 'Spaceship',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty query (no filters)', () => {
    const result = DdfStructuredQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
