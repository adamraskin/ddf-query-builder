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

  it('rejects a string value outside the allowed enum for StandardStatus', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'StandardStatus',
      operator: 'eq',
      value: 'Teleporting',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a real PropertySubType value (confirmed against the actual EDMX enum)', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'PropertyType',
      operator: 'eq',
      value: 'Single Family',
    });
    expect(result.success).toBe(true);
  });

  it('regression: rejects "Cottage" as a PropertyType value (real fix: Cottage is an ArchitecturalStyle, not a PropertySubType)', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'PropertyType',
      operator: 'eq',
      value: 'Cottage',
    });
    expect(result.success).toBe(false);
  });

  it('regression: rejects "Condo" as a PropertyType value (real fix: condo is a CommonInterest/ownership concept, not a PropertySubType)', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'PropertyType',
      operator: 'eq',
      value: 'Condo',
    });
    expect(result.success).toBe(false);
  });

  it('accepts "Condo/Strata" as a CommonInterest value (the real, correct home for "condo")', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'CommonInterest',
      operator: 'eq',
      value: 'Condo/Strata',
    });
    expect(result.success).toBe(true);
  });

  it('accepts "Cottage" as an ArchitecturalStyle value (the real, correct home for this concept)', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'ArchitecturalStyle',
      operator: 'eq',
      value: 'Cottage',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a fractional value for an integer-only field (regression: model sent BathroomsTotal=2.5)', () => {
    const result = DdfFilterSchema.safeParse({
      field: 'BathroomsTotal',
      operator: 'gte',
      value: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty query (no filters)', () => {
    const result = DdfStructuredQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('regression: rejects a faked "or" — same field with two conflicting eq values ANDed together', () => {
    const result = DdfStructuredQuerySchema.safeParse({
      filters: [
        { field: 'City', operator: 'eq', value: 'Ottawa' },
        { field: 'City', operator: 'eq', value: 'Gatineau' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('does not flag the same field appearing twice with different operators (e.g. a price range)', () => {
    const result = DdfStructuredQuerySchema.safeParse({
      filters: [
        { field: 'ListPrice', operator: 'gte', value: 400000 },
        { field: 'ListPrice', operator: 'lte', value: 600000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('normalizes null pagination fields to undefined (regression: model was forced to invent top/skip under strict schemas)', () => {
    const result = DdfStructuredQuerySchema.safeParse({
      filters: [],
      pagination: { top: null, skip: null, count: null },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagination.top).toBeUndefined();
      expect(result.data.pagination.skip).toBeUndefined();
      expect(result.data.pagination.count).toBeUndefined();
    }
  });

  it('still accepts real pagination values when the model does provide them', () => {
    const result = DdfStructuredQuerySchema.safeParse({
      filters: [],
      pagination: { top: 5, skip: null, count: true },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagination.top).toBe(5);
      expect(result.data.pagination.skip).toBeUndefined();
      expect(result.data.pagination.count).toBe(true);
    }
  });
});
