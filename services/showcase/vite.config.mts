import fs from 'node:fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import type { Plugin as ESBuildPlugin } from 'esbuild';
import flowRemoveTypes from 'flow-remove-types';
import { defineConfig, transformWithEsbuild, type Plugin as VitePlugin } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const reactNativeWebPath = require.resolve('react-native-web/dist/index.js');
const development = process.env.NODE_ENV === 'development';

const extensions = [
  '.web.mjs',
  '.mjs',
  '.web.js',
  '.js',
  '.web.mts',
  '.mts',
  '.web.ts',
  '.ts',
  '.web.jsx',
  '.jsx',
  '.web.tsx',
  '.tsx',
  '.json',
];

const reactNativeFlowJsxPathPattern = /\.(js|flow)$/;
const flowPragmaPattern = /@flow\b/;
const reactNativeFlowJsxLoader = 'jsx';

const flowEsbuildPlugin = (): ESBuildPlugin => ({
  name: 'react-native-web',
  setup: (build) => {
    build.onLoad({ filter: reactNativeFlowJsxPathPattern }, async (args) => {
      let contents = await fs.readFile(args.path, 'utf-8');

      if (flowPragmaPattern.test(contents)) {
        const transformed = flowRemoveTypes(contents);
        contents = transformed.toString();
      }

      return {
        contents,
        loader: reactNativeFlowJsxLoader,
      };
    });
  },
});

const flowTransformPlugin = (): VitePlugin => ({
  enforce: 'pre',
  name: 'react-native-web-flow',
  async transform(code, id) {
    const cleanId = id.split('?')[0];

    if (!reactNativeFlowJsxPathPattern.test(cleanId)) {
      return;
    }

    const transformed = flowRemoveTypes(code);
    const result = await transformWithEsbuild(transformed.toString(), cleanId, {
      loader: reactNativeFlowJsxLoader,
      jsx: 'automatic',
    });

    return { code: result.code, map: result.map };
  },
});

export default defineConfig({
  plugins: [
    flowTransformPlugin(),
    react({
      babel: {
        babelrc: false,
        configFile: false,
      },
    }),
  ],
  build: {
    commonjsOptions: {
      extensions,
      transformMixedEsModules: true,
    },
  },
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: reactNativeWebPath },
      { find: /require\.context$/, replacement: path.resolve(rootDir, 'require.context.vite.ts') },
      { find: /^pages\//, replacement: `${path.resolve(rootDir, 'src/pages')}/` },
      { find: /^components\//, replacement: `${path.resolve(rootDir, 'src/components')}/` },
    ],
    extensions,
  },
  server: {
    fs: {
      allow: [path.resolve(rootDir, '../..')],
    },
  },
  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(development),
    'process.env.EXPO_OS': JSON.stringify('web'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
  optimizeDeps: {
    include: ['react-native-web'],
    esbuildOptions: {
      plugins: [flowEsbuildPlugin()],
      resolveExtensions: extensions,
    },
  },
});
