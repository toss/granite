import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/jest/index.ts'],
  outDir: 'dist/jest',
  format: 'cjs',
  dts: true,
});
