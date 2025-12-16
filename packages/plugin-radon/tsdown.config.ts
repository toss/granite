import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    minify: true,
  },
  {
    entry: 'src/routerBabel.js',
    outDir: 'dist',
    format: ['esm','cjs'],
    dts: false,
    minify: true,
  },
]);
