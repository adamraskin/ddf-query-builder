import { describe, it, expect } from 'vitest';
import { translateToUrl, buildFilterClause } from './translator';
import { DDF_FIELDS } from './ddf-metadata';
import { DdfStructuredQuery } from './ddf-schema';

const BASE_URL = 'https://ddfapi.example.com/odata/v1/Property';

function emptyQuery(overrides: Partial<DdfStructuredQuery> = {}): DdfStructuredQuery {
  return {
    filters: [],
    orderBy: [],
    pagination: {},
    unsupported: [],
    ...overrides,
  };
}

describe('translator defaults', () => {
  it('produces a valid URL with no filters and default pagination', () => {
    const url = translateToUrl(emptyQuery(), { baseUrl: BASE_URL });
    expect(url).toContain(BASE_URL);
    expect(url).toContain('%24top=25'); // $top URL-encoded
  });

  it('omits $filter and $orderby when not provided', () => {
    const url = translateToUrl(emptyQuery(), { baseUrl: BASE_URL });
    expect(url).not.toContain('%24filter');
    expect(url).not.toContain('%24orderby');
  });
});

describe('every field + every valid operator produces a filter clause', () => {
  for (const field of DDF_FIELDS) {
    for (const operator of field.operators) {
      it(`${field.key} ${operator}`, () => {
        const value = field.examples[0];
        const clause = buildFilterClause({ field: field.key as any, operator, value } as any);
        expect(clause).toContain(field.ddfField);
        if (operator === 'contains') {
          expect(clause).toMatch(/^contains\(/);
        } else {
          expect(clause).not.toMatch(/^contains\(/);
        }
      });
    }
  }
});

describe('value formatting', () => {
  it('single-quotes string values and escapes embedded quotes', () => {
    const clause = buildFilterClause({ field: 'City', operator: 'eq', value: "O'Brien" } as any);
    expect(clause).toBe("City eq 'O''Brien'");
  });

  it('formats numeric values without quotes', () => {
    const clause = buildFilterClause({ field: 'ListPrice', operator: 'gte', value: 400000 } as any);
    expect(clause).toBe('ListPrice ge 400000');
  });

  it('formats boolean values as lowercase literals', () => {
    const clause = buildFilterClause({ field: 'Pool', operator: 'eq', value: true } as any);
    expect(clause).toBe('PoolYN eq true');
  });

  it('builds a contains() call for text search', () => {
    const clause = buildFilterClause({ field: 'City', operator: 'contains', value: 'Ott' } as any);
    expect(clause).toBe("contains(City, 'Ott')");
  });
});

describe('combining multiple filters', () => {
  it('joins filters with "and"', () => {
    const url = translateToUrl(
      emptyQuery({
        filters: [
          { field: 'City', operator: 'eq', value: 'Gatineau' },
          { field: 'BedroomsTotal', operator: 'gte', value: 3 },
          { field: 'Pool', operator: 'eq', value: true },
        ],
      }),
      { baseUrl: BASE_URL },
    );
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
    expect(decoded).toContain(
      "$filter=City eq 'Gatineau' and BedroomsTotal ge 3 and PoolYN eq true",
    );
  });
});

describe('orderBy', () => {
  it('maps internal field keys to real DDF field names', () => {
    const url = translateToUrl(
      emptyQuery({ orderBy: [{ field: 'ListPrice', direction: 'desc' }] }),
      { baseUrl: BASE_URL },
    );
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
    expect(decoded).toContain('$orderby=ListPrice desc');
  });

  it('supports multiple orderBy clauses, comma separated', () => {
    const url = translateToUrl(
      emptyQuery({
        orderBy: [
          { field: 'City', direction: 'asc' },
          { field: 'ListPrice', direction: 'desc' },
        ],
      }),
      { baseUrl: BASE_URL },
    );
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
    expect(decoded).toContain('$orderby=City asc,ListPrice desc');
  });
});

describe('pagination', () => {
  it('respects an explicit top and skip', () => {
    const url = translateToUrl(emptyQuery({ pagination: { top: 10, skip: 20 } }), {
      baseUrl: BASE_URL,
    });
    const decoded = decodeURIComponent(url.replace(/\+/g, ' '));
    expect(decoded).toContain('$top=10');
    expect(decoded).toContain('$skip=20');
  });

  it('includes $count only when requested', () => {
    const withCount = translateToUrl(emptyQuery({ pagination: { count: true } }), {
      baseUrl: BASE_URL,
    });
    const withoutCount = translateToUrl(emptyQuery(), { baseUrl: BASE_URL });
    expect(decodeURIComponent(withCount)).toContain('$count=true');
    expect(withoutCount).not.toContain('%24count');
  });
});
