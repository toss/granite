import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/runtime/**/*.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
