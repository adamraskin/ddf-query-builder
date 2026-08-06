import { describe, it, expect } from 'vitest';
import { DDF_FIELDS, translateToUrl, DdfStructuredQuery } from '@ddf/shared';
import { config } from '../../config';
import { isDdfConfigured, sleep, fetchDdfStatus } from './ddf-fetch';

/**
 * Fires every real field/operator combination the translator can produce
 * at the actual DDF API ($top=1, one request at a time, ~1s apart). No LLM
 * involved — this is pure translator output vs. the real API.
 *
 * Opt-in only (`npm run test:ddf-live`): needs DDF OAuth creds configured,
 * and it makes real network calls against whatever DDF_BASE_URL points at
 * (currently QA, per .env).
 */

function emptyQuery(overrides: Partial<DdfStructuredQuery> = {}): DdfStructuredQuery {
  return {
    filters: [],
    orderBy: [],
    pagination: { top: 1 },
    unsupported: [],
    ...overrides,
  };
}

interface Case {
  name: string;
  query: DdfStructuredQuery;
}

function buildCases(): Case[] {
  const cases: Case[] = [];

  for (const field of DDF_FIELDS) {
    for (const operator of field.operators) {
      // Boolean-typed fields get both true and false — "false" is the
      // riskier, previously-untested "not X/any(...)" negation form.
      const values = field.dataType === 'boolean' ? [true, false] : [field.examples[0]];
      for (const value of values) {
        cases.push({
          name: `${field.key} ${operator} ${JSON.stringify(value)}`,
          query: emptyQuery({
            filters: [{ field: field.key as DdfStructuredQuery['filters'][number]['field'], operator, value } as DdfStructuredQuery['filters'][number]],
          }),
        });
      }
    }
  }

  return cases;
}

describe.skipIf(!isDdfConfigured())('DDF live field/operator coverage ($top=1 real requests, ~1s apart)', () => {
  let first = true;

  async function checkQuery(query: DdfStructuredQuery) {
    if (!first) await sleep(1000);
    first = false;

    const url = translateToUrl(query, { baseUrl: config.ddfBaseUrl });
    const result = await fetchDdfStatus(url);
    if (!result.ok) {
      throw new Error(`DDF returned ${result.status} for:\n${url}\n${result.bodySnippet ?? ''}`);
    }
  }

  it('baseline: no filters', async () => {
    await checkQuery(emptyQuery());
  });

  for (const testCase of buildCases()) {
    it(
      testCase.name,
      async () => {
        await checkQuery(testCase.query);
      },
      15_000,
    );
  }
});
