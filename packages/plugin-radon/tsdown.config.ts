import { defineConfig } from 'tsdown';
import { builtinModules } from 'module';

export default defineConfig([
  {
    entry: ['src/babel.js'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    target: 'node16',
    external: builtinModules,
  },
  {
    entry: {
      'lib/runtime': 'src/lib/runtime.js'
    },
    format: 'cjs',
    outDir: 'dist',
    target: 'node16',
    splitting: false,
    dts: false,
    sourcemap: false,
    clean: false, // Important: do not clean the dist folder again
    bundle: true,
    platform: 'node',
    external: [/^react-native\//],
  }
]);
