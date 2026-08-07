import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    host: 'src/host/index.ts',
    plugin: 'src/plugin/index.ts',
    runtime: 'src/runtime/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  fixedExtension: false,
});
