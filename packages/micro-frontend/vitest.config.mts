import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const nativeRequire = createRequire(require.resolve('@granite-js/native/@react-navigation/native'));
const navigationRequire = createRequire(nativeRequire.resolve('@react-navigation/native'));

export default defineConfig({
  resolve: {
    alias: {
      '@granite-js/native/@react-navigation/native': navigationRequire.resolve('@react-navigation/core'),
      'react-native': fileURLToPath(new URL('./test/reactNative.ts', import.meta.url)),
    },
  },
  test: {
    server: { deps: { inline: [/@react-navigation\//] } },
    // examples/portal/__tests__ is deliberately out of scope: those specs belong to the example's
    // own Jest setup (examples/portal/jest.config.js), which supplies the react-native preset this
    // config replaces with a stub. Run them with `yarn --cwd examples/portal test`, not here.
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
