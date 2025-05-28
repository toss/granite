import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest',

  test: {
    globalSetup: ['./vitest.global-setup.mts'],
    include: ['src/**/*.spec.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
});
