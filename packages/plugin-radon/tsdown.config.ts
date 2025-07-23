import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    minify: true,
  },
  {
    entry: 'src/babel.js',
    outDir: 'dist',
    format: ['cjs'],
    dts: false,
    minify: true,
    external: ['fs', 'path', '@babel/core', '@babel/template', '@babel/types'],
  },
  {
    entry: 'src/lib/vendor/RNpolyfill/polyfill_babel.js',
    outDir: 'dist/lib/RNpolyfill',
    format: ['cjs'],
    dts: false,
    minify: true,
    external: ['@babel/core', '@babel/template', '@babel/types'],
  },
  {
    entry: 'src/lib/runtime.js',
    outDir: 'dist/lib',
    format: ['cjs'],
    dts: false,
    minify: true,
  },
  {
    entry: 'src/lib/vendor/RNpolyfill/react_devtools_polyfill.js',
    outDir: 'dist/lib/RNpolyfill',
    format: ['cjs'],
    dts: false,
    minify: true,
  },
  {
    entry: 'src/lib/vendor/RNpolyfill/createReactDevtoolsAgent.js',
    outDir: 'dist/lib/RNpolyfill',
    format: ['cjs'],
    dts: false,
    minify: true,
  },
  {
    entry: 'src/lib/vendor/RNpolyfill/createRendererConfig.js',
    outDir: 'dist/lib/RNpolyfill',
    format: ['cjs'],
    dts: false,
    minify: true,
  },
  {
    entry: 'src/lib/vendor/rn-renderer/**/*.js',
    outDir: 'dist/lib/rn-renderer',
    format: ['cjs'],
    dts: false,
    minify: true,
    external: ['scheduler'],
  },
]);
