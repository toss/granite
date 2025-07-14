import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/babel.js'],
    format: ['cjs', 'esm'],
    dts: true,
    external: ['@granite-js/react-native', 'react'],
  },
  {
    entry: ['src/lib/runtime.js'],
    outDir: 'dist/lib',
    format: ['cjs'],
    outExtensions: () => ({ js: '.cjs' }),
  },
  {
    entry: ['src/lib/RNpolyfill/react_devtools_polyfill.js'],
    outDir: 'dist/lib/RNpolyfill',
    format: ['cjs'],
    minify: true,
    noExternal: () => true,  // Include all dependencies in bundle
    outExtensions: () => ({ js: '.cjs' }),
  },
  {
    entry: ['src/lib/RNpolyfill/radonPolyfillBabel.js'],
    outDir: 'dist',
    format: ['cjs'],
    outExtensions: () => ({ js: '.cjs' }),
  },
]);
