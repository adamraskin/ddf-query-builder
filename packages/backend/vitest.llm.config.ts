import { defineConfig } from 'vitest/config';

/**
 * Config for the opt-in LLM reliability suite (`npm run test:llm`).
 * Separate from vitest.config.ts because these tests hit a real,
 * locally-running LM Studio server and are slow/non-deterministic —
 * they must never run as part of the default `npm test`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.llm.test.ts'],
    testTimeout: 120_000,
  },
});
