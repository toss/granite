import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest',
  resolve: {
    alias: {
      '@granite-js/brownfield-module': new URL('./test/brownfieldModuleMock.ts', import.meta.url).pathname,
      'react-native': new URL('./test/reactNativeMock.ts', import.meta.url).pathname,
    },
  },
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
