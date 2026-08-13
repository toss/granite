import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': fileURLToPath(new URL('./test/reactNative.ts', import.meta.url)),
    },
  },
  test: {
    // examples/portal/__tests__ is deliberately out of scope: those specs belong to the example's
    // own Jest setup (examples/portal/jest.config.js), which supplies the react-native preset this
    // config replaces with a stub. Run them with `yarn --cwd examples/portal test`, not here.
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
