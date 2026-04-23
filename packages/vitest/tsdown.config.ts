import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/reactNativeRuntime.ts', 'src/setup.ts'],
  format: ['esm'],
  dts: true,
  fixedExtension: false,
});
