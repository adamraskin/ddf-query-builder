import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // *.llm.test.ts hits a real, locally-running LM Studio server and is
    // opt-in only (`npm run test:llm`) — see vitest.llm.config.ts.
    exclude: [...configDefaults.exclude, 'src/**/*.llm.test.ts'],
  },
});
