import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest',
  test: {
    include: ['src/**/*.spec.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});
