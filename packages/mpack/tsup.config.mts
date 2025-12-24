import { defineConfig } from 'tsup';

const RESOLVE_EXTENSION = ['ts', 'js'];

export default defineConfig({
  entry: [
    `src/**/*.{${RESOLVE_EXTENSION.join(',')}}`,
    '!**/*.{spec,test,stories,d}.*',
    '!**/fixtures/**',
    '!**/__snapshots__/**',
    '!**/experimental/**',
  ],
  format: ['cjs'],
  external: ['pnpapi'],
  dts: false,
  bundle: false,
  clean: true,
});
