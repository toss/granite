import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
  },
  {
    entry: ['src/runtime/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist/runtime',
  },
]);
