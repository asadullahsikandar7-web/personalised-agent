import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Integration tests share one MongoDB connection lifecycle across files (see tests/helpers.ts);
    // running files sequentially avoids races on that shared connect/disconnect state.
    fileParallelism: false,
  },
});
