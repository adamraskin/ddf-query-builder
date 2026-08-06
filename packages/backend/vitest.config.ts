import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // *.llm.test.ts hits a real, locally-running LM Studio server and is
    // opt-in only (`npm run test:llm`) — see vitest.llm.config.ts.
    // *.ddf-live.test.ts hits the real DDF API and is opt-in only
    // (`npm run test:ddf-live`) — see vitest.ddf-live.config.ts.
    exclude: [...configDefaults.exclude, 'src/**/*.llm.test.ts', 'src/**/*.ddf-live.test.ts'],
  },
});
