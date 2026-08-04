import { DdfFilter, DdfOrderBy, DdfPagination, DdfStructuredQuery } from './ddf-schema';
import { getFieldMetadata } from './ddf-metadata';

/**
 * Converts a validated DdfStructuredQuery into a real DDF OData URL.
 * This module has zero AI/LLM dependency: any valid JSON contract
 * produces a valid DDF URL, deterministically.
 */

export interface TranslatorOptions {
  /** Base DDF/RESO OData endpoint, e.g. https://ddfapi.realtor.ca/odata/v1/Property */
  baseUrl: string;
}

const DEFAULT_TOP = 20;

/** Maps our internal operator vocabulary to OData filter syntax. */
function operatorToOData(operator: DdfFilter['operator']): string {
  switch (operator) {
    case 'eq':
      return 'eq';
    case 'gt':
      return 'gt';
    case 'gte':
      return 'ge';
    case 'lt':
      return 'lt';
    case 'lte':
      return 'le';
    case 'contains':
      // handled separately as a function call, not an infix operator
      return 'contains';
    default: {
      const _exhaustive: never = operator;
      throw new Error(`Unsupported operator: ${_exhaustive}`);
    }
  }
}

function formatValue(value: DdfFilter['value']): string {
  if (typeof value === 'string') {
    // OData string literals are single-quoted; escape embedded quotes by doubling them.
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

export function buildFilterClause(filter: DdfFilter): string {
  const meta = getFieldMetadata(filter.field);
  if (!meta) {
    throw new Error(`Unknown field: ${filter.field}`);
  }
  const fieldName = meta.ddfField;

  if (filter.operator === 'contains') {
    return `contains(${fieldName}, ${formatValue(filter.value)})`;
  }
  if (meta.booleanStrategy && typeof filter.value === 'boolean') {
    switch (meta.booleanStrategy) {
      case 'arrayNonEmpty':
        // OData v4 collection lambda: /any() with no predicate checks the
        // collection is non-empty. The real field (e.g. PoolFeatures) is
        // an array, not a boolean — there is no "PoolYN"-style flag.
        return filter.value ? `${fieldName}/any()` : `not ${fieldName}/any()`;
      case 'numericPositive':
        // Proxy a boolean concept (e.g. "has a garage") via a real numeric
        // field (e.g. ParkingTotal) DDF actually exposes.
        return filter.value ? `${fieldName} gt 0` : `${fieldName} eq 0`;
    }
  }
  return `${fieldName} ${operatorToOData(filter.operator)} ${formatValue(filter.value)}`;
}

export function buildFilterParam(filters: DdfFilter[]): string | undefined {
  if (!filters || filters.length === 0) return undefined;
  return filters.map(buildFilterClause).join(' and ');
}

export function buildOrderByParam(orderBy: DdfOrderBy[] | undefined): string | undefined {
  if (!orderBy || orderBy.length === 0) return undefined;
  return orderBy
    .map((o) => {
      const meta = getFieldMetadata(o.field);
      const fieldName = meta ? meta.ddfField : o.field;
      return o.direction === 'desc' ? `${fieldName} desc` : `${fieldName} asc`;
    })
    .join(',');
}

export function buildPaginationParams(
  pagination: DdfPagination | undefined,
): Record<string, string> {
  const params: Record<string, string> = {};
  const top = pagination?.top ?? DEFAULT_TOP;
  params.$top = String(top);
  if (pagination?.skip !== undefined) {
    params.$skip = String(pagination.skip);
  }
  if (pagination?.count) {
    params.$count = 'true';
  }
  return params;
}

export function translateToUrl(query: DdfStructuredQuery, options: TranslatorOptions): string {
  const params: [string, string][] = [];

  const filterParam = buildFilterParam(query.filters);
  if (filterParam) {
    params.push(['$filter', filterParam]);
  }

  const orderByParam = buildOrderByParam(query.orderBy);
  if (orderByParam) {
    params.push(['$orderby', orderByParam]);
  }

  const paginationParams = buildPaginationParams(query.pagination);
  for (const [key, value] of Object.entries(paginationParams)) {
    params.push([key, value]);
  }

  if (params.length === 0) {
    return options.baseUrl;
  }

  // Only the VALUE is percent-encoded (spaces, quotes, etc.). The KEY is left
  // literal on purpose: OData reserves "$filter", "$top", etc. and some
  // gateways match query option names before URL-decoding them, so an
  // encoded key ("%24filter") is silently ignored or 404s even though the
  // $ character is perfectly legal, unencoded, in a URI query component.
  const queryString = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  const separator = options.baseUrl.includes('?') ? '&' : '?';
  return `${options.baseUrl}${separator}${queryString}`;
}
