import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/config.ts', 'src/cli.ts', 'src/jest.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
});
