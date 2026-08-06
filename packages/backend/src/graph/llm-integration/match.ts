import type { DdfFilter, DdfOrderBy, DdfPagination, DdfStructuredQuery } from '@ddf/shared';

/**
 * Real LLM output isn't byte-identical run to run, so expectations describe
 * the shape a "correct" answer must have rather than an exact query. Each
 * required filter accepts a set of acceptable operators (e.g. a bare "3
 * bedrooms" could reasonably come back as "eq" or "gte") instead of pinning
 * down the one the model happened to choose.
 */
export interface RequiredFilter {
  field: DdfFilter['field'];
  value: DdfFilter['value'];
  operators: DdfFilter['operator'][];
}

/** orderBy position check. direction is optional when the prompt doesn't imply one. */
export interface ExpectedOrderBy {
  field: DdfOrderBy['field'];
  direction?: DdfOrderBy['direction'];
}

export interface QueryExpectation {
  /** The graph must succeed (no validation/extraction error) for this prompt. Default true. */
  expectSuccess?: boolean;
  /** Filters that must be present, with a flexible operator (any of the listed ones). */
  requiredFilters?: RequiredFilter[];
  /** Fields that must NOT appear as a filter at all (e.g. faked "or", soft preferences). */
  forbiddenFields?: DdfFilter['field'][];
  /** Substrings (case-insensitive) that must each appear in at least one unsupported[] entry. */
  unsupportedContains?: string[];
  /** Expected orderBy, position by position. */
  orderBy?: ExpectedOrderBy[];
  pagination?: Partial<DdfPagination>;
}

export interface MatchResult {
  ok: boolean;
  problems: string[];
}

export function matchQuery(query: DdfStructuredQuery, expectation: QueryExpectation): MatchResult {
  const problems: string[] = [];

  for (const req of expectation.requiredFilters ?? []) {
    const found = query.filters.some(
      (f) => f.field === req.field && req.operators.includes(f.operator) && f.value === req.value,
    );
    if (!found) {
      problems.push(
        `missing required filter: ${req.field} [${req.operators.join('|')}] ${JSON.stringify(req.value)}`,
      );
    }
  }

  for (const field of expectation.forbiddenFields ?? []) {
    const found = query.filters.find((f) => f.field === field);
    if (found) {
      problems.push(`forbidden field present: ${field} (${found.operator} ${JSON.stringify(found.value)})`);
    }
  }

  for (const phrase of expectation.unsupportedContains ?? []) {
    const found = query.unsupported.some((u) => u.toLowerCase().includes(phrase.toLowerCase()));
    if (!found) {
      problems.push(`expected "${phrase}" to be noted in unsupported[] (got: ${JSON.stringify(query.unsupported)})`);
    }
  }

  if (expectation.orderBy) {
    if (query.orderBy.length !== expectation.orderBy.length) {
      problems.push(
        `orderBy length mismatch: expected ${expectation.orderBy.length}, got ${query.orderBy.length} (${JSON.stringify(query.orderBy)})`,
      );
    } else {
      expectation.orderBy.forEach((expected, i) => {
        const actual = query.orderBy[i];
        if (actual.field !== expected.field) {
          problems.push(`orderBy[${i}].field mismatch: expected ${expected.field}, got ${actual.field}`);
        } else if (expected.direction && actual.direction !== expected.direction) {
          problems.push(`orderBy[${i}].direction mismatch: expected ${expected.direction}, got ${actual.direction}`);
        }
      });
    }
  }

  if (expectation.pagination) {
    const { top, skip, count } = expectation.pagination;
    if (top !== undefined && query.pagination.top !== top) {
      problems.push(`pagination.top mismatch: expected ${top}, got ${query.pagination.top}`);
    }
    if (skip !== undefined && query.pagination.skip !== skip) {
      problems.push(`pagination.skip mismatch: expected ${skip}, got ${query.pagination.skip}`);
    }
    if (count !== undefined && query.pagination.count !== count) {
      problems.push(`pagination.count mismatch: expected ${count}, got ${query.pagination.count}`);
    }
  }

  return { ok: problems.length === 0, problems };
}
