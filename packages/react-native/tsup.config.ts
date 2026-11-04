import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/config.ts', 'src/cli.ts', 'src/jest.ts', 'src/async-bridges.ts', 'src/constant-bridges.ts'],
  outDir: 'dist',
  clean: true,
  format: ['esm', 'cjs'],
  dts: true,
});
