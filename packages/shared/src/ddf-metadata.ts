import { DdfDataType } from './types';

/**
 * Single source of truth for every field the system understands. The
 * prompt builder, structured-output schema, and translator all derive
 * from this file, so adding a field never requires editing prompts by hand.
 */

/** Operators supported by the translator. */
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
  /**
   * Defaults to true. Some real DDF fields exist and are readable, but DDF
   * rejects them outright in $filter — distinct from "no operator works",
   * since the field itself is still a legitimate concept to describe to
   * the LLM, just not a filterable one.
   */
  filterable?: boolean;
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
   * dataType 'boolean' concepts (Pool, Waterfront, Garage) backed by a real
   * array/enum field, using a curated whitelist of real enum values. true
   * -> the array contains ANY of these values; false -> none of them.
   *   e.g. Garage -> ParkingFeatures, checked against
   *   ['Garage','Attached Garage',...] specifically (ParkingFeatures also
   *   contains many non-garage values like 'Street'/'RV'/'Boat House', so
   *   "any element present" would be wrong — this checks for the
   *   garage-specific values only).
   *
   * Translates to OData v4 collection-lambda syntax ("/any(...)") — see
   * translator.ts.
   */
  arrayOneOf?: readonly string[];
  /**
   * True when the real DDF field is itself a collection (e.g.
   * ArchitecturalStyle is "Array of Strings"). eq/contains need OData
   * collection-lambda syntax ("Field/any(f: f eq 'X')") instead of a
   * direct comparison, which isn't valid against a collection.
   */
  arrayField?: boolean;
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
    // Real field is PropertySubType.
    ddfField: 'PropertySubType',
    dataType: 'string',
    operators: OPS.equalityOnly,
    description: 'The property sub-type.',
    examples: ['Single Family', 'Multi-family'],
    allowedValues: [
      'Single Family',
      'Multi-family',
      'Recreational',
      'Agriculture',
      'Vacant Land',
      'Office',
      'Retail',
      'Business',
      'Industrial',
      'Parking',
      'Institutional - Special Purpose',
      'Other',
      'Hospitality',
    ],
  },
  {
    key: 'CommonInterest',
    displayName: 'Ownership Structure',
    // Ownership structure (condo/strata vs. freehold), distinct from
    // PropertyType/PropertySubType (physical/use classification).
    ddfField: 'CommonInterest',
    dataType: 'string',
    operators: OPS.equalityOnly,
    description:
      "The property's ownership structure — e.g. condo/strata vs. freehold. Use this (not PropertyType) for \"condo\" requests.",
    examples: ['Condo/Strata', 'Freehold'],
    allowedValues: ['Freehold', 'Condo/Strata', 'Timeshare/Fractional', 'Leasehold'],
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
    key: 'Fireplace',
    displayName: 'Has Fireplace',
    // Real, direct boolean field — doesn't need the arrayOneOf treatment
    // Pool/Waterfront/Garage below need, since FireplaceYN is a real
    // scalar boolean, not an array.
    ddfField: 'FireplaceYN',
    dataType: 'boolean',
    operators: OPS.boolean,
    description: 'Whether the property includes a fireplace.',
    examples: [true, false],
  },
  {
    key: 'Pool',
    displayName: 'Has Pool',
    // Real field is PoolFeatures (array of enum strings). Checked against
    // a curated whitelist of PoolFeatures values that clearly indicate an
    // actual pool exists. Excludes ambiguous entries ("Pool equipment"
    // alone, "Unknown").
    ddfField: 'PoolFeatures',
    dataType: 'boolean',
    operators: OPS.boolean,
    arrayOneOf: [
      'Pool',
      'Inground pool',
      'Above ground pool',
      'On Ground Pool',
      'Outdoor pool',
      'Indoor pool',
      'Heated pool',
      'Salt Water Pool',
      'Lap Pool',
      'Kidney Shaped',
      'Slide',
      'Diving Board',
    ],
    description: 'Whether the property has a pool (checked against real PoolFeatures values).',
    examples: [true, false],
  },
  {
    key: 'Waterfront',
    displayName: 'Waterfront',
    // Real field is WaterfrontFeatures (array of enum strings). Excludes
    // "Waterfront nearby" (implies NOT actually on the water),
    // "Indirect Waterfront", and "Waterfront Community" (describes the
    // community, not necessarily this specific lot) — these read as
    // meaningfully weaker/different claims than "is waterfront".
    ddfField: 'WaterfrontFeatures',
    dataType: 'boolean',
    operators: OPS.boolean,
    arrayOneOf: [
      'Waterfront',
      'Waterfront on lake',
      'Waterfront on ocean',
      'Waterfront on river',
      'Waterfront on pond',
      'Waterfront on stream',
      'Waterfront on creek',
      'Waterfront on canal',
      'Deeded water access',
      'Restricted waterfront',
      'Waterfront, Road Between',
      'Island',
      'Direct Waterfront',
    ],
    description: 'Whether the property is on a waterfront (checked against real WaterfrontFeatures values).',
    examples: [true, false],
  },
  {
    key: 'Garage',
    displayName: 'Has Garage',
    // Real field is ParkingFeatures — a large array that also includes
    // many NON-garage values (Street, RV, Boat House, Visitor Parking,
    // etc.), so "array is non-empty" would be wrong. Checked against a
    // whitelist of specifically garage-related real values instead.
    ddfField: 'ParkingFeatures',
    dataType: 'boolean',
    operators: OPS.boolean,
    arrayOneOf: ['Garage', 'Attached Garage', 'Integrated Garage', 'Detached Garage', 'Heated Garage', 'Underground', 'Indoor', 'Parkade'],
    description: 'Whether the property has a garage (checked against real ParkingFeatures values, not just any parking).',
    examples: [true, false],
  },
  {
    key: 'ArchitecturalStyle',
    displayName: 'Architectural Style',
    // Real array field; the correct home for style descriptors like
    // "cottage" or "bungalow" (not PropertyType).
    ddfField: 'ArchitecturalStyle',
    dataType: 'string',
    operators: OPS.equalityOnly,
    arrayField: true,
    description: 'The architectural style of the structure.',
    examples: ['Cottage', 'Bungalow', 'Ranch'],
    allowedValues: [
      'Hillside Bungalow', 'Split entry bungalow', 'A-Frame', 'Bungalow', 'Contemporary',
      'Cape Cod', 'Carriage', 'Chalet', 'Character', 'Church', 'Cottage', 'Cabin', 'Camp',
      'Custom', 'Log house/cabin', 'Luxury Villa', 'Mini', 'Neighbourhood', 'Penthouse',
      'Raised bungalow', 'Raised ranch', 'Ranch', 'Tudor', 'Westcoast', 'Cathedral entry',
      'Multi-level', 'Basement entry', 'Ground level entry', 'Bi-level', 'Split level entry',
      '2 Level', '3 Level', '4 Level', '5 Level', 'Other', 'None', 'Unknown', 'Tower',
      'High rise', 'Low rise', 'Multi-Unit', 'Cab-Over', 'Mobile Home', 'Loft', 'Cross Dock',
      'Lower Level', 'Off 2nd Floor', 'Raised Ranch w/ Bonus Room', 'Top Floor',
    ],
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
    // DDF rejects StandardStatus in $filter outright — "The property
    // 'StandardStatus' cannot be used in the $filter query option." (400).
    // Not just an unsupported operator: the field can't be filtered on at
    // all, so it gets no operators and is marked non-filterable.
    operators: [],
    filterable: false,
    description:
      'The current status of the listing. DDF only publishes Active listings through this feed, and does not allow filtering on this field.',
    examples: ['Active'],
    allowedValues: ['Active'],
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
  if (field.filterable === false) return false;
  return (field.operators as readonly string[]).includes(operator);
}

export function isKnownField(key: string): key is DdfFieldKey {
  return FIELD_BY_KEY.has(key);
}