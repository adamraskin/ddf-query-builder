import { DdfFilter, DdfOrderBy, DdfPagination, DdfStructuredQuery } from './ddf-schema';
import { getFieldMetadata } from './ddf-metadata';

/**
 * Converts a validated DdfStructuredQuery into a real DDF OData URL.
 * Deterministic — no LLM dependency: any valid JSON contract produces a
 * valid DDF URL.
 */

export interface TranslatorOptions {
  /** Base DDF/RESO OData endpoint, e.g. https://ddfapi.realtor.ca/odata/v1/Property */
  baseUrl: string;
}

export const DEFAULT_TOP = 20;

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

  // Boolean concept backed by a real array field, checked against a
  // curated whitelist of real enum values (e.g. Garage -> ParkingFeatures
  // contains one of ['Garage','Attached Garage',...]).
  if (meta.arrayOneOf && typeof filter.value === 'boolean') {
    const predicate = meta.arrayOneOf.map((v) => `f eq ${formatValue(v)}`).join(' or ');
    return filter.value ? `${fieldName}/any(f: ${predicate})` : `not ${fieldName}/any(f: ${predicate})`;
  }

  // String/enum field where the real DDF field is itself a collection
  // (e.g. ArchitecturalStyle).
  if (meta.arrayField) {
    if (filter.operator === 'contains') {
      return `${fieldName}/any(f: contains(f, ${formatValue(filter.value)}))`;
    }
    return `${fieldName}/any(f: f ${operatorToOData(filter.operator)} ${formatValue(filter.value)})`;
  }

  if (filter.operator === 'contains') {
    return `contains(${fieldName}, ${formatValue(filter.value)})`;
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

  // KEY is left literal: OData reserves "$filter", "$top", etc., and DDF's
  // gateway matches query option names before URL-decoding them, so an
  // encoded key ("%24filter") is silently ignored or 404s.
  //
  // VALUE is minimally escaped, not run through encodeURIComponent — DDF's
  // gateway doesn't reliably decode %XX sequences back to their original
  // characters before matching/parsing (notably for "$" and space). Only
  // characters that would break the URL/query-string's structure if left
  // raw are escaped: "%" itself (ambiguous otherwise), "&" (new query
  // parameter), "#" (URL fragment), and newlines. Everything else — spaces,
  // quotes, slashes, colons, commas, parens — stays exactly as generated.
  const queryString = params
    .map(([key, value]) => `${key}=${minimalUrlValueEscape(value)}`)
    .join('&');

  const separator = options.baseUrl.includes('?') ? '&' : '?';
  return `${options.baseUrl}${separator}${queryString}`;
}

function minimalUrlValueEscape(value: string): string {
  return value
    .replace(/%/g, '%25') // must run first, or it would double-escape the others below
    .replace(/&/g, '%26')
    .replace(/#/g, '%23')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}
