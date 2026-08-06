import { describe, it, expect } from 'vitest';
import { translateToUrl, buildFilterClause, DEFAULT_TOP } from './translator';
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
    expect(url).toContain(`$top=${DEFAULT_TOP}`);
  });

  it('keeps reserved OData keys literal, never percent-encoded', () => {
    const url = translateToUrl(
      emptyQuery({ filters: [{ field: 'City', operator: 'eq', value: 'Ottawa' }] }),
      { baseUrl: BASE_URL },
    );
    expect(url).toContain('$filter=');
    expect(url).not.toContain('%24');
  });

  it('omits $filter and $orderby when not provided', () => {
    const url = translateToUrl(emptyQuery(), { baseUrl: BASE_URL });
    expect(url).not.toContain('$filter');
    expect(url).not.toContain('$orderby');
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
    const clause = buildFilterClause({ field: 'Fireplace', operator: 'eq', value: true } as any);
    expect(clause).toBe('FireplaceYN eq true');
  });

  it('translates Garage (arrayOneOf) to an OR-of-real-values lambda against ParkingFeatures', () => {
    const trueClause = buildFilterClause({ field: 'Garage', operator: 'eq', value: true } as any);
    const falseClause = buildFilterClause({ field: 'Garage', operator: 'eq', value: false } as any);
    expect(trueClause).toBe(
      "ParkingFeatures/any(f: f eq 'Garage' or f eq 'Attached Garage' or f eq 'Integrated Garage' or f eq 'Detached Garage' or f eq 'Heated Garage' or f eq 'Underground' or f eq 'Indoor' or f eq 'Parkade')",
    );
    expect(falseClause).toMatch(/^not ParkingFeatures\/any\(/);
  });

  it('regression: Garage does NOT match on unrelated ParkingFeatures values like Street or RV', () => {
    // The whitelist is exhaustive and explicit — this just documents that
    // intent by checking the generated clause never references anything
    // outside the curated garage-specific list.
    const clause = buildFilterClause({ field: 'Garage', operator: 'eq', value: true } as any);
    expect(clause).not.toContain('Street');
    expect(clause).not.toContain('RV');
    expect(clause).not.toContain('Boat House');
  });

  it('translates ArchitecturalStyle (arrayField) using OData collection-lambda syntax', () => {
    const clause = buildFilterClause({ field: 'ArchitecturalStyle', operator: 'eq', value: 'Cottage' } as any);
    expect(clause).toBe("ArchitecturalStyle/any(f: f eq 'Cottage')");
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
          { field: 'Fireplace', operator: 'eq', value: true },
        ],
      }),
      { baseUrl: BASE_URL },
    );
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain(
      "$filter=City eq 'Gatineau' and BedroomsTotal ge 3 and FireplaceYN eq true",
    );
  });
});

describe('orderBy', () => {
  it('maps internal field keys to real DDF field names', () => {
    const url = translateToUrl(
      emptyQuery({ orderBy: [{ field: 'ListPrice', direction: 'desc' }] }),
      { baseUrl: BASE_URL },
    );
    const decoded = decodeURIComponent(url);
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
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('$orderby=City asc,ListPrice desc');
  });
});

describe('regression: minimal escaping — nothing is percent-encoded except what would break the URL', () => {
  it('leaves spaces, slashes, colons, and commas completely literal', () => {
    const url = translateToUrl(
      emptyQuery({
        filters: [{ field: 'ArchitecturalStyle', operator: 'eq', value: 'Cottage' }],
        orderBy: [
          { field: 'City', direction: 'asc' },
          { field: 'ListPrice', direction: 'desc' },
        ],
      }),
      { baseUrl: BASE_URL },
    );
    expect(url).not.toMatch(/%/);
    expect(url).toContain("ArchitecturalStyle/any(f: f eq 'Cottage')");
    expect(url).toContain('$orderby=City asc,ListPrice desc');
  });

  it('still escapes % itself, to avoid ambiguous double-encoding', () => {
    const url = translateToUrl(
      emptyQuery({ filters: [{ field: 'City', operator: 'eq', value: '50% Discount District' }] }),
      { baseUrl: BASE_URL },
    );
    expect(url).toContain('50%25 Discount District');
  });

  it('escapes & so it cannot be read as a new query parameter', () => {
    const url = translateToUrl(
      emptyQuery({ filters: [{ field: 'City', operator: 'eq', value: 'Smith & Sons Estates' }] }),
      { baseUrl: BASE_URL },
    );
    expect(url).toContain('Smith %26 Sons Estates');
    // Splitting on '&' should yield exactly the real params, not an extra fake one.
    const paramCount = url.split('&').length;
    expect(paramCount).toBe(2); // $filter and $top only
  });

  it('escapes # so it cannot be read as a URL fragment', () => {
    const url = translateToUrl(
      emptyQuery({ filters: [{ field: 'City', operator: 'eq', value: 'Unit #4' }] }),
      { baseUrl: BASE_URL },
    );
    expect(url).toContain('Unit %234');
  });
});

describe('pagination', () => {
  it('respects an explicit top and skip', () => {
    const url = translateToUrl(emptyQuery({ pagination: { top: 10, skip: 20 } }), {
      baseUrl: BASE_URL,
    });
    const decoded = decodeURIComponent(url);
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

describe('regression: reserved OData param names must never be percent-encoded', () => {
  it('produces literal $filter, $orderby, $top, $skip, $count — not %24filter etc.', () => {
    const url = translateToUrl(
      emptyQuery({
        filters: [{ field: 'City', operator: 'eq', value: 'Ottawa' }],
        orderBy: [{ field: 'ListPrice', direction: 'desc' }],
        pagination: { top: 10, skip: 5, count: true },
      }),
      { baseUrl: BASE_URL },
    );
    expect(url).not.toMatch(/%24/);
    expect(url).toContain('?$filter=');
    expect(url).toContain('&$orderby=');
    expect(url).toContain('&$top=10');
    expect(url).toContain('&$skip=5');
    expect(url).toContain('&$count=true');
  });
});
