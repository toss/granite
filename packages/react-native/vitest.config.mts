import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.{ts,tsx}'],
    },
  },
});
