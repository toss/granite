import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  external: ['nx', '@nx/devkit'],
  format: 'esm',
  dts: false,
  bundle: true,
  shims: true,
  banner: {
    js: `globalThis.require=(await import('module')).createRequire(import.meta.url);`,
  },
});
