import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest',
  test: {
    hookTimeout: 60_000,
    include: ['src/**/*.spec.ts'],
    testTimeout: 60_000,
  },
});
