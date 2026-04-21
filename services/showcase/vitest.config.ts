import { defineConfig } from 'vitest/config';
import { reactNative } from '@granite-js/vitest';

export default defineConfig({
  plugins: [reactNative()],
  test: {
    globals: true,
    environment: 'node',
  },
});