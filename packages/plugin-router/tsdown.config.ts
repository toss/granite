import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/next/index.ts',
    mpack: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  fixedExtension: false,
});
