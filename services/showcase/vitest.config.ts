import { reactNative } from '@granite-js/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [reactNative()],
  test: {
    globals: true,
    environment: 'node',
  },
});