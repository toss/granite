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
    entry: ['src/lib/react_devtools_polyfill.js'],
    outDir: 'dist/lib',
    format: ['cjs'],
    minify: true,
    noExternal: () => true,  // Include all dependencies in bundle
    outExtensions: () => ({ js: '.cjs' }),
  },
  {
    entry: ['src/radonPolyfillPlugin.ts'],
    outDir: 'dist',
    format: ['cjs'],
    minify: true,
    noExternal: () => true,  // Include all dependencies in bundle
    outExtensions: () => ({ js: '.cjs' }),
  },
  {
    entry: ['src/lib/radonPolyfillBabel.js'],
    outDir: 'dist',
    format: ['cjs'],
    outExtensions: () => ({ js: '.cjs' }),
  },
]);
