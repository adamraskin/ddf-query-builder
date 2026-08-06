import { defineConfig } from 'vitest/config';

/**
 * Config for the opt-in DDF field/operator coverage suite (`npm run
 * test:ddf-live`). Separate from vitest.config.ts because these tests hit
 * the real DDF API and are slow (rate-limited to ~1 request/sec) — they
 * must never run as part of the default `npm test`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.ddf-live.test.ts'],
    testTimeout: 120_000,
  },
});
