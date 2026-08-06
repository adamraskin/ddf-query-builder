import { describe, it, expect, beforeAll } from 'vitest';
import { buildQueryGraph } from '../build-graph';
import { config } from '../../config';
import { matchQuery } from './match';
import { LLM_TEST_CASES } from './cases';

/**
 * True end-to-end reliability check for the extraction step: real LM
 * Studio, real prompt, real schema validation. This is NOT part of `npm
 * test` (see vitest.llm.config.ts) — it needs a live local model and is
 * inherently non-deterministic, so it lives behind `npm run test:llm`.
 *
 * Each case runs multiple times (LLM_TEST_RUNS, default 3) because the
 * question isn't just "can it get this right" but "does it get this right
 * reliably" — a single lucky pass hides a model/prompt that's flaky in
 * practice.
 */

const RUNS = Number(process.env.LLM_TEST_RUNS ?? 3);
const MIN_PASS_RATE = Number(process.env.LLM_TEST_MIN_PASS_RATE ?? 0.66);

async function isLmStudioReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${config.lmStudio.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.lmStudio.apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

const reachable = await isLmStudioReachable();

if (!reachable) {
  // eslint-disable-next-line no-console
  console.warn(
    `\n[llm-integration] Skipping: LM Studio not reachable at ${config.lmStudio.baseUrl}. ` +
      `Start the local server (LM Studio -> Developer -> Start Server) and re-run "npm run test:llm".\n`,
  );
}

interface CaseSummary {
  name: string;
  passRate: number;
  sampleProblems: string[];
}

const summaries: CaseSummary[] = [];

describe.skipIf(!reachable)(`LLM extraction reliability (model: ${config.lmStudio.model}, ${RUNS} runs/case)`, () => {
  const graph = buildQueryGraph();

  for (const testCase of LLM_TEST_CASES) {
    it(
      testCase.name,
      async () => {
        const problemsByRun: string[][] = [];
        let passes = 0;

        for (let run = 0; run < RUNS; run++) {
          const result = await graph.invoke({ input: testCase.prompt });
          const expectSuccess = testCase.expectation.expectSuccess ?? true;

          if (expectSuccess && result.error) {
            problemsByRun.push([`graph errored: ${result.error}`]);
            continue;
          }
          if (!expectSuccess) {
            if (!result.error) problemsByRun.push(['expected the graph to error, but it succeeded']);
            else passes++;
            continue;
          }
          if (!result.structuredQuery) {
            problemsByRun.push(['no structuredQuery on the result']);
            continue;
          }

          const { ok, problems } = matchQuery(result.structuredQuery, testCase.expectation);
          if (ok) {
            passes++;
          } else {
            problemsByRun.push(problems);
          }
        }

        const passRate = passes / RUNS;
        summaries.push({
          name: testCase.name,
          passRate,
          sampleProblems: problemsByRun[0] ?? [],
        });

        if (passRate < MIN_PASS_RATE) {
          const detail = problemsByRun.map((p, i) => `  run ${i + 1}: ${p.join('; ')}`).join('\n');
          throw new Error(
            `"${testCase.prompt}"\npass rate ${passes}/${RUNS} (need >= ${MIN_PASS_RATE}). Failures:\n${detail}`,
          );
        }
      },
      // Real model calls are slow; give each case room for RUNS sequential invocations.
      30_000 * RUNS,
    );
  }

  it('prints a reliability summary', () => {
    // eslint-disable-next-line no-console
    console.log('\n--- LLM extraction reliability summary ---');
    for (const s of summaries) {
      const pct = `${Math.round(s.passRate * 100)}%`.padStart(4);
      // eslint-disable-next-line no-console
      console.log(`${pct}  ${s.name}${s.passRate < 1 && s.sampleProblems.length ? `\n      e.g. ${s.sampleProblems[0]}` : ''}`);
    }
    console.log('-------------------------------------------\n');
    expect(summaries.length).toBe(LLM_TEST_CASES.length);
  });
});
