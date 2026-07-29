import { DdfDataType } from './types';

/**
 * This registry is the single source of truth for every field the system
 * understands. The prompt builder , the structured-output
 * schema  and the translator all derive from
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
    ddfField: 'PropertyType',
    dataType: 'string',
    operators: OPS.equalityOnly,
    description: 'The category of property listing.',
    examples: ['Residential', 'Condo', 'Commercial'],
    allowedValues: ['Residential', 'Condo', 'Commercial', 'Land', 'MultiFamily'],
  },
  {
    key: 'BedroomsTotal',
    displayName: 'Bedrooms',
    ddfField: 'BedroomsTotal',
    dataType: 'number',
    operators: OPS.numeric,
    description: 'Total number of bedrooms in the property.',
    examples: [2, 3, 4],
  },
  {
    key: 'BathroomsTotal',
    displayName: 'Bathrooms',
    ddfField: 'BathroomsTotalInteger',
    dataType: 'number',
    operators: OPS.numeric,
    description: 'Total number of bathrooms in the property.',
    examples: [1, 2, 3],
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
    ddfField: 'PoolYN',
    dataType: 'boolean',
    operators: OPS.boolean,
    description: 'Whether the property has a pool.',
    examples: [true, false],
  },
  {
    key: 'Waterfront',
    displayName: 'Waterfront',
    ddfField: 'WaterfrontYN',
    dataType: 'boolean',
    operators: OPS.boolean,
    description: 'Whether the property is on a waterfront.',
    examples: [true, false],
  },
  {
    key: 'Garage',
    displayName: 'Has Garage',
    ddfField: 'GarageYN',
    dataType: 'boolean',
    operators: OPS.boolean,
    description: 'Whether the property has a garage.',
    examples: [true, false],
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
