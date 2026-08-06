import type { QueryExpectation } from './match';

export interface LlmTestCase {
  name: string;
  prompt: string;
  expectation: QueryExpectation;
}

/**
 * Real-world prompts, mostly mined from test.md. Expectations are
 * deliberately loose where the "right" mapping is genuinely ambiguous
 * (e.g. "residential"/"commercial" don't correspond to a single allowed
 * PropertySubType value) and tight where a specific mapping is being
 * checked (condo -> CommonInterest, cottage -> ArchitecturalStyle, soft
 * preferences, "or"
 * handling, half-bathrooms).
 */
export const LLM_TEST_CASES: LlmTestCase[] = [
  {
    name: 'basic AND of city/beds/baths/price/garage',
    prompt: '3 bedroom, 2 bathroom houses in Ottawa between 400k and 600k with a garage',
    expectation: {
      requiredFilters: [
        { field: 'City', value: 'Ottawa', operators: ['eq'] },
        { field: 'BedroomsTotal', value: 3, operators: ['eq', 'gte'] },
        { field: 'BathroomsTotal', value: 2, operators: ['eq', 'gte'] },
        { field: 'ListPrice', value: 400000, operators: ['gte', 'gt'] },
        { field: 'ListPrice', value: 600000, operators: ['lte', 'lt'] },
        { field: 'Garage', value: true, operators: ['eq'] },
      ],
    },
  },
  {
    name: 'regression: "condo" maps to CommonInterest, not PropertyType',
    prompt: 'Condos in Gatineau with at least 2 bedrooms, under 350000, no pool',
    expectation: {
      requiredFilters: [
        { field: 'City', value: 'Gatineau', operators: ['eq'] },
        { field: 'CommonInterest', value: 'Condo/Strata', operators: ['eq'] },
        { field: 'BedroomsTotal', value: 2, operators: ['gte'] },
        { field: 'ListPrice', value: 350000, operators: ['lt', 'lte'] },
        { field: 'Pool', value: false, operators: ['eq'] },
      ],
      forbiddenFields: ['PropertyType'],
    },
  },
  {
    name: 'hallucination guard: "residential" has no matching allowed PropertyType value',
    prompt: 'waterfront residential properties with 4+ bedrooms and at least 3 bathrooms',
    expectation: {
      // No PropertyType assertion either way: the point of this case is
      // that the model must NOT invent 'Residential' as a value (which
      // would fail schema validation and error the whole request out).
      expectSuccess: true,
      requiredFilters: [
        { field: 'Waterfront', value: true, operators: ['eq'] },
        { field: 'BedroomsTotal', value: 4, operators: ['gte'] },
        { field: 'BathroomsTotal', value: 3, operators: ['gte'] },
      ],
    },
  },
  {
    name: 'sort: cheapest first',
    prompt: 'Cheapest 2 bedroom condos in Ottawa first',
    expectation: {
      requiredFilters: [
        { field: 'City', value: 'Ottawa', operators: ['eq'] },
        { field: 'CommonInterest', value: 'Condo/Strata', operators: ['eq'] },
        { field: 'BedroomsTotal', value: 2, operators: ['eq', 'gte'] },
      ],
      orderBy: [{ field: 'ListPrice', direction: 'asc' }],
    },
  },
  {
    name: 'sort: most bedrooms first',
    prompt: 'Houses in Gatineau sorted by bedrooms, most first',
    expectation: {
      requiredFilters: [{ field: 'City', value: 'Gatineau', operators: ['eq'] }],
      orderBy: [{ field: 'BedroomsTotal', direction: 'desc' }],
    },
  },
  {
    name: 'sort: two-level orderby',
    prompt: 'Show me listings in Ottawa ordered by price from low to high, then by bathroom count',
    expectation: {
      requiredFilters: [{ field: 'City', value: 'Ottawa', operators: ['eq'] }],
      orderBy: [{ field: 'ListPrice', direction: 'asc' }, { field: 'BathroomsTotal' }],
    },
  },
  {
    name: 'unmapped concepts go to unsupported, not City',
    prompt: 'Walkable 3 bedroom homes near good schools in Ottawa under 500k',
    expectation: {
      requiredFilters: [
        { field: 'City', value: 'Ottawa', operators: ['eq'] },
        { field: 'BedroomsTotal', value: 3, operators: ['eq', 'gte'] },
        { field: 'ListPrice', value: 500000, operators: ['lt', 'lte'] },
      ],
      unsupportedContains: ['school'],
    },
  },
  {
    name: 'no field exists at all for the concept -> unsupported',
    prompt: 'Recently renovated houses with a finished basement in Gatineau',
    expectation: {
      requiredFilters: [{ field: 'City', value: 'Gatineau', operators: ['eq'] }],
      unsupportedContains: ['renovat', 'basement'],
    },
  },
  {
    name: 'regression: no "or" support -> field omitted, not faked with two eq/contains',
    prompt: 'Commercial properties in Ottawa or Gatineau',
    expectation: {
      expectSuccess: true,
      forbiddenFields: ['City'],
    },
  },
  {
    name: 'negation: "not waterfront"',
    prompt: 'Houses that are not waterfront',
    expectation: {
      requiredFilters: [{ field: 'Waterfront', value: false, operators: ['eq'] }],
    },
  },
  {
    name: 'regression: half-bathrooms decomposition (2.5 baths is not a valid BathroomsTotal)',
    prompt:
      'Residential property in Ottawa, 4+ bedrooms, at least 2.5 bathrooms, priced between 450000 and 700000, must have a garage and a pool, not on a waterfront, top 8 results sorted by price low to high',
    expectation: {
      requiredFilters: [
        { field: 'City', value: 'Ottawa', operators: ['eq'] },
        { field: 'BedroomsTotal', value: 4, operators: ['gte'] },
        { field: 'BathroomsTotal', value: 2, operators: ['eq', 'gte'] },
        { field: 'HalfBathrooms', value: 1, operators: ['eq', 'gte'] },
        { field: 'ListPrice', value: 450000, operators: ['gte', 'gt'] },
        { field: 'ListPrice', value: 700000, operators: ['lte', 'lt'] },
        { field: 'Garage', value: true, operators: ['eq'] },
        { field: 'Pool', value: true, operators: ['eq'] },
        { field: 'Waterfront', value: false, operators: ['eq'] },
      ],
      orderBy: [{ field: 'ListPrice', direction: 'asc' }],
      pagination: { top: 8 },
    },
  },
  {
    name: 'regression: soft preferences ("no X needed", "would be nice") never become filters',
    prompt:
      'Condos in Gatineau, at least 2 bedrooms and 2 bathrooms, under 400k, in a pet-friendly building, no pool needed but a garage would be nice, skip the first 5 and give me the next 10',
    expectation: {
      requiredFilters: [
        { field: 'City', value: 'Gatineau', operators: ['eq'] },
        { field: 'CommonInterest', value: 'Condo/Strata', operators: ['eq'] },
        { field: 'BedroomsTotal', value: 2, operators: ['gte'] },
        { field: 'BathroomsTotal', value: 2, operators: ['gte'] },
        { field: 'ListPrice', value: 400000, operators: ['lt', 'lte'] },
      ],
      forbiddenFields: ['Pool', 'Garage'],
      pagination: { top: 10, skip: 5 },
    },
  },
  {
    name: 'regression: "or" city + numeric range + soft preference combined',
    prompt:
      'Residential homes in Ottawa or Gatineau with 3 to 5 bedrooms, at least 2 bathrooms, built after 2010, under 600000, waterfront preferred, sorted by bedrooms descending then price ascending',
    expectation: {
      expectSuccess: true,
      forbiddenFields: ['City', 'Waterfront'],
      requiredFilters: [
        { field: 'BedroomsTotal', value: 3, operators: ['gte'] },
        { field: 'BedroomsTotal', value: 5, operators: ['lte', 'lt'] },
        { field: 'BathroomsTotal', value: 2, operators: ['gte'] },
        { field: 'YearBuilt', value: 2010, operators: ['gt', 'gte'] },
        { field: 'ListPrice', value: 600000, operators: ['lt', 'lte'] },
      ],
      orderBy: [{ field: 'BedroomsTotal', direction: 'desc' }, { field: 'ListPrice', direction: 'asc' }],
    },
  },
  {
    name: 'few-shot regression: "condo" + parking spaces + cheapest first',
    prompt: 'condos with at least 2 parking spaces, cheapest first',
    expectation: {
      requiredFilters: [
        { field: 'CommonInterest', value: 'Condo/Strata', operators: ['eq'] },
        { field: 'ParkingSpaces', value: 2, operators: ['gte'] },
      ],
      forbiddenFields: ['PropertyType'],
      orderBy: [{ field: 'ListPrice', direction: 'asc' }],
    },
  },
  {
    name: 'few-shot regression: "cottage" maps to ArchitecturalStyle, not PropertyType',
    prompt: 'waterfront cottage with a garage, 2 to 3 bedrooms',
    expectation: {
      requiredFilters: [
        { field: 'ArchitecturalStyle', value: 'Cottage', operators: ['eq'] },
        { field: 'Waterfront', value: true, operators: ['eq'] },
        { field: 'Garage', value: true, operators: ['eq'] },
        { field: 'BedroomsTotal', value: 2, operators: ['gte'] },
        { field: 'BedroomsTotal', value: 3, operators: ['lte', 'lt'] },
      ],
      forbiddenFields: ['PropertyType'],
    },
  },
];
