import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    next: 'src/next/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  fixedExtension: false,
});
