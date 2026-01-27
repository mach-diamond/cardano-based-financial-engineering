import { defineConfig } from 'vitest/config';
import path from 'path';

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
    server: {
      deps: {
        inline: [
          'libsodium-wrappers-sumo',
          'libsodium-sumo',
          '@lucid-evolution/lucid',
        ],
      },
    },
  },
  resolve: {
    alias: {
      // Force CJS version for libsodium
      'libsodium-wrappers-sumo': path.resolve(
        __dirname,
        '../node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js'
      ),
    },
  },
});
