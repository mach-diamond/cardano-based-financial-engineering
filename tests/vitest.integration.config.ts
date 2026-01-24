import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/integration/**/*.test.ts'],
    testTimeout: 120000, // 2 minutes for blockchain operations
    hookTimeout: 60000,
    sequence: {
      shuffle: false, // Run in order for integration tests
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run sequentially to avoid UTxO conflicts
      },
    },
  },
});
