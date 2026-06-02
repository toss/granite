import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  target: false,
  dts: true,
  clean: false,
  exports: true,
  fixedExtension: false,
});
