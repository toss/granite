import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@granite-js/micro-frontend': fileURLToPath(new URL('./test/microFrontend.ts', import.meta.url)),
      'react-native': fileURLToPath(new URL('./test/reactNative.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
