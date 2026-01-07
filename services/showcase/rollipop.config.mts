import { defineConfig, rolldown } from 'rollipop';
import { id, code, include, and } from 'rollipop/pluginutils';
import * as swc from '@swc/core';
import * as fs from 'fs';

function transformToEs5(code: string, filename: string) {
  const transformResult = swc.transformSync(code, {
    filename,
    jsc: {
      parser: {
        syntax: 'typescript',
      },
      target: 'es5',
      loose: false,
      assumptions: {
        privateFieldsAsProperties: true,
        setPublicClassFields: true,
      },
    },
    module: {
      type: 'commonjs',
    },
  });

  return transformResult.code;
}

const customHmrRuntimeModule = 'hmr-runtime.ts';
const customHmrRuntimeCode = (
  await rolldown.build({
    input: customHmrRuntimeModule,
    external: ['rolldown:runtime'],
    checks: {
      eval: false,
    },
    output: { format: 'esm' },
  })
).output[0].code;

const customHmrClientModule = 'hmr-client.ts';
const customHmrClientModuleCode = fs.readFileSync(customHmrClientModule, 'utf-8');

export default defineConfig({
  entry: 'index.ts',
  devMode: {
    hmr: {
      runtimeImplement: transformToEs5(customHmrRuntimeCode, customHmrRuntimeModule),
      clientImplement: transformToEs5(customHmrClientModuleCode, customHmrClientModule),
    },
  },
  transformer: {
    flow: {
      filter: [include(and(id(/\.jsx?$/), code(/@flow/))), include(id(/node_modules\/react-native-video/))],
    },
    babel: {
      rules: [
        {
          filter: [include(id(/node_modules\/es-toolkit/))],
          options: {
            plugins: [[require.resolve('@babel/plugin-transform-unicode-regex')]],
          },
        },
      ],
    },
  },
});
