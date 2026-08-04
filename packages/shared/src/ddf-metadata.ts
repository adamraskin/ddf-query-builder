import { DdfDataType } from './types';

/**
 * This registry is the single source of truth for every field the system
 * understands. The prompt builder, the structured-output
 * schema (Milestone 5), and the translator (Milestone 3) all derive from
 * this file so that adding a field never requires editing prompts by hand.
 */

/** Operators supported by the MVP translator. Kept intentionally small (Risk #2). */
export const DDF_OPERATORS = ['eq', 'gt', 'gte', 'lt', 'lte', 'contains'] as const;
export type DdfOperator = (typeof DDF_OPERATORS)[number];

export interface DdfFieldMetadata {
  /** Stable key used internally and by the LLM's structured output. */
  key: string;
  /** Human-friendly name, used in the UI and in prompt examples. */
  displayName: string;
  /** The actual field name as it appears in the DDF/RESO OData feed. */
  ddfField: string;
  dataType: DdfDataType;
  /** Which operators are valid for this field. Must be a subset of DDF_OPERATORS. */
  operators: readonly DdfOperator[];
  description: string;
  /** A couple of example values, used both in prompts and in tests. */
  examples: (string | number | boolean)[];
  /** For enum-like string fields, the closed set of accepted values (optional). */
  allowedValues?: readonly string[];
  /**
   * Real DDF integer fields (e.g. BathroomsTotalInteger, YearBuilt) reject
   * fractional values. Checked in DdfFilterSchema; dataType stays 'number'
   * so the LLM contract doesn't need a separate integer type.
   */
  integerOnly?: boolean;
  /**
   * Some concepts we expose as a simple boolean (Pool, Waterfront, Garage)
   * don't correspond to an actual boolean field in the real DDF model —
   * confirmed against the real Property model schema. The LLM still only
   * ever sees/produces true/false for these; this tells the translator how
   * to turn that into a real OData clause against the field DDF actually
   * exposes:
   *  - 'arrayNonEmpty': the real field is an array (e.g. PoolFeatures).
   *    true -> "<field>/any()", false -> "not <field>/any()".
   *  - 'numericPositive': proxy via a real numeric field (e.g. ParkingTotal
   *    standing in for "has a garage", since DDF has no garage-specific
   *    flag or enum we've confirmed). true -> "<field> gt 0", false -> "<field> eq 0".
   */
  booleanStrategy?: 'arrayNonEmpty' | 'numericPositive';
}

const OPS = {
  equalityOnly: ['eq'] as const,
  numeric: ['eq', 'gt', 'gte', 'lt', 'lte'] as const,
  text: ['eq', 'contains'] as const,
  boolean: ['eq'] as const,
};

export const DDF_FIELDS: readonly DdfFieldMetadata[] = [
  {
    key: 'City',
    displayName: 'City',
    ddfField: 'City',
    dataType: 'string',
    operators: OPS.text,
    description: 'The city or municipality where the property is located.',
    examples: ['Ottawa', 'Gatineau', 'Toronto'],
  },
  {
    key: 'PropertyType',
    displayName: 'Property Type',
    // Real field is PropertySubType (Enum: PropertySubType), e.g. "Condo".
    // The public docs show this as a pick-list field, so we constrain the
    // model to a practical set of common property sub-types rather than
    // allowing arbitrary invented values.
    ddfField: 'PropertySubType',
    dataType: 'string',
    operators: OPS.equalityOnly,
    description:
      'The property sub-type, such as Residential, Condo, Duplex, Commercial, or Land.',
    examples: ['Condo', 'Duplex', 'Residential'],
    allowedValues: [
      'Residential',
      'Condo',
      'Duplex',
      'Townhouse',
      'Commercial',
      'Land',
      'Business',
      'Manufactured',
      'Modular',
      'Agriculture',
    ],
  },
  {
    key: 'BedroomsTotal',
    displayName: 'Bedrooms',
    ddfField: 'BedroomsTotal',
    dataType: 'number',
    operators: OPS.numeric,
    integerOnly: true,
    description: 'Total number of bedrooms in the dwelling.',
    examples: [2, 3, 4],
  },
  {
    key: 'BathroomsTotal',
    displayName: 'Bathrooms',
    ddfField: 'BathroomsTotalInteger',
    dataType: 'number',
    operators: OPS.numeric,
    integerOnly: true,
    description: 'The simple sum of the number of full bathrooms. Integer only — use HalfBathrooms for partial baths.',
    examples: [1, 2, 3],
  },
  {
    key: 'HalfBathrooms',
    displayName: 'Half Bathrooms',
    ddfField: 'BathroomsPartial',
    dataType: 'number',
    operators: OPS.numeric,
    integerOnly: true,
    description:
      'Number of partial (half) bathrooms. For "2.5 bathrooms", use BathroomsTotal=2 and HalfBathrooms=1.',
    examples: [0, 1, 2],
  },
  {
    key: 'ListPrice',
    displayName: 'List Price',
    ddfField: 'ListPrice',
    dataType: 'number',
    operators: OPS.numeric,
    description: 'The current listing price of the property, in CAD.',
    examples: [350000, 500000, 750000],
  },
  {
    key: 'Pool',
    displayName: 'Has Pool',
    // Real field is PoolFeatures (array of enum strings) — there is no
    // PoolYN boolean in the actual DDF model. "true" is translated to
    // "PoolFeatures/any()" (the array is non-empty).
    ddfField: 'PoolFeatures',
    dataType: 'boolean',
    operators: OPS.boolean,
    booleanStrategy: 'arrayNonEmpty',
    description: 'Whether the property has any recorded pool feature.',
    examples: [true, false],
  },
  {
    key: 'LotSizeArea',
    displayName: 'Lot Size Area',
    ddfField: 'LotSizeArea',
    dataType: 'number',
    operators: OPS.numeric,
    description: 'The total area of the lot.',
    examples: [500, 1000, 2500],
  },
  {
    key: 'LotSizeUnits',
    displayName: 'Lot Size Units',
    ddfField: 'LotSizeUnits',
    dataType: 'string',
    operators: OPS.equalityOnly,
    description: 'The unit used for the lot size measurement.',
    examples: ['Acres', 'Square Feet'],
  },
  {
    key: 'CityRegion',
    displayName: 'City Region',
    ddfField: 'CityRegion',
    dataType: 'string',
    operators: OPS.text,
    description: 'A sub-section or area of a city.',
    examples: ['Parkdale', 'Downtown', 'West End'],
  },
  {
    key: 'Waterfront',
    displayName: 'Waterfront',
    // Real field is WaterfrontFeatures (array of enum strings) — there is
    // no WaterfrontYN boolean in the actual DDF model.
    ddfField: 'WaterfrontFeatures',
    dataType: 'boolean',
    operators: OPS.boolean,
    booleanStrategy: 'arrayNonEmpty',
    description: 'Whether the property has any recorded waterfront feature.',
    examples: [true, false],
  },
  {
    key: 'Garage',
    displayName: 'Has Garage',
    // DDF has no garage-specific flag or confirmed enum value — this is a
    // best-effort proxy via ParkingTotal (any recorded parking, not
    // necessarily an enclosed garage). Revisit once we can confirm the
    // real ParkingFeatures enum values (would allow an exact
    // ParkingFeatures/any(f: f eq 'Garage') check instead).
    ddfField: 'ParkingTotal',
    dataType: 'boolean',
    operators: OPS.boolean,
    booleanStrategy: 'numericPositive',
    description:
      'Whether the property has at least one recorded parking space. Best-effort proxy for "has a garage" — DDF does not expose a dedicated garage flag.',
    examples: [true, false],
  },
  {
    key: 'ParkingSpaces',
    displayName: 'Parking Spaces',
    ddfField: 'ParkingTotal',
    dataType: 'number',
    operators: OPS.numeric,
    integerOnly: true,
    description: 'Total number of parking spaces included in the sale.',
    examples: [1, 2, 4],
  },
  {
    key: 'YearBuilt',
    displayName: 'Year Built',
    ddfField: 'YearBuilt',
    dataType: 'number',
    operators: OPS.numeric,
    integerOnly: true,
    description: 'The year an occupancy permit was first granted for the structure.',
    examples: [1995, 2010, 2020],
  },
  {
    key: 'Stories',
    displayName: 'Stories',
    ddfField: 'Stories',
    dataType: 'number',
    operators: OPS.numeric,
    description: 'The number of floors/storeys in the property (can be fractional, e.g. a split-level).',
    examples: [1, 1.5, 2],
  },
  {
    key: 'StandardStatus',
    displayName: 'Listing Status',
    ddfField: 'StandardStatus',
    dataType: 'string',
    operators: OPS.equalityOnly,
    // Based on the RESO Data Dictionary's standard StandardStatus lookup
    // (one of RESO's more consistently standardized fields) — not yet
    // confirmed against DDF's actual deployed enum values.
    description: 'The current status of the listing (e.g. Active, Pending, Closed).',
    examples: ['Active', 'Pending', 'Closed'],
    allowedValues: [
      'Active',
      'ActiveUnderContract',
      'Canceled',
      'Closed',
      'ComingSoon',
      'Expired',
      'Hold',
      'Incomplete',
      'Pending',
      'Withdrawn',
    ],
  },
  {
    key: 'PostalCode',
    displayName: 'Postal Code',
    ddfField: 'PostalCode',
    dataType: 'string',
    operators: OPS.text,
    description: "The postal code portion of the property's address.",
    examples: ['K1A 0B1', 'J8X'],
  },
  {
    key: 'StreetName',
    displayName: 'Street Name',
    ddfField: 'StreetName',
    dataType: 'string',
    operators: OPS.text,
    description: "The street name portion of the property's address.",
    examples: ['Main Street', 'Elgin'],
  },
  {
    key: 'WaterBodyName',
    displayName: 'Water Body Name',
    ddfField: 'WaterBodyName',
    dataType: 'string',
    operators: OPS.text,
    description:
      'The name of the body of water the property is on, if known (lake, river, ocean, canal, etc.).',
    examples: ['Rideau River', 'Lac Leamy'],
  },
] as const;

export type DdfFieldKey = (typeof DDF_FIELDS)[number]['key'];

export const DDF_FIELD_KEYS = DDF_FIELDS.map((f) => f.key) as [DdfFieldKey, ...DdfFieldKey[]];

const FIELD_BY_KEY = new Map(DDF_FIELDS.map((f) => [f.key, f]));

export function getFieldMetadata(key: string): DdfFieldMetadata | undefined {
  return FIELD_BY_KEY.get(key);
}

export function isOperatorValidForField(fieldKey: string, operator: string): boolean {
  const field = getFieldMetadata(fieldKey);
  if (!field) return false;
  return (field.operators as readonly string[]).includes(operator);
}

export function isKnownField(key: string): key is DdfFieldKey {
  return FIELD_BY_KEY.has(key);
}