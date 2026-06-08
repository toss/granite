import { reactNative } from '@granite-js/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vitest',
  plugins: [
    reactNative(),
    {
      name: 'granite-react-native-jsdom-test-environment',
      config() {
        return {
          test: {
            environment: 'jsdom',
          },
        };
      },
    },
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    coverage: {
      exclude: ['.vitest/**'],
    },
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.{ts,tsx}'],
    },
  },
});
