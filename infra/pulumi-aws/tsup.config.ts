import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: './src/index.ts',
    },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true,
    shims: true,
    external: ['@granite-js/pulumi-aws'],
    publicDir: './public',
  },
  {
    entry: {
      'lambda/origin-request': './src/lambda/origin-request.ts',
      'lambda/origin-response': './src/lambda/origin-response.ts',
      'lambda/auto-cache-removal': './src/lambda/auto-cache-removal.ts',
    },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true,
  },
]);
