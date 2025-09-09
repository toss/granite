import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest',

  test: {
    include: ['src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});
