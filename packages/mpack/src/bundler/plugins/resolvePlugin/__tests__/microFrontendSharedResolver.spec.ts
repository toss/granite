import path from 'path';
import type { BuildConfig } from '@granite-js/plugin-core';
import { describe, expect, it } from 'vitest';
import { createSharedResolverConfig } from '../../../../../../micro-frontend/src/plugin/resolver';
import { buildWithEsbuild, evaluate } from '../../../../testing';
import type { INTERNAL__Id } from '../../../../types';
import { resolvePlugin } from '../resolvePlugin';

describe('micro-frontend shared resolver', () => {
  it('does not evaluate an unused host export getter while loading a shared module', async () => {
    const buildConfig: BuildConfig = {
      entry: path.resolve(__dirname, 'fixtures/micro-frontend-shared/entry.js'),
      outfile: '',
      platform: 'android',
      resolver: createSharedResolverConfig([['shared-native-module', {}]]),
    };
    const result = await buildWithEsbuild(buildConfig, {
      banner: {
        js: [
          'var sharedNamespace = {};',
          "Object.defineProperty(sharedNamespace, 'default', { enumerable: true, get: function () { return 'Default'; } });",
          "Object.defineProperty(sharedNamespace, 'linked', { enumerable: true, get: function () { return 'Linked'; } });",
          "Object.defineProperty(sharedNamespace, 'unlinked', { enumerable: true, get: function () { throw new Error('Unlinked native module was evaluated'); } });",
          "global._graniteMicroFrontend = { sharedModules: { 'shared-native-module': { get: function () { return sharedNamespace; } } } };",
        ].join('\n'),
      },
      format: 'cjs',
      platform: 'node',
      plugins: [
        resolvePlugin({
          context: {
            id: 'micro-frontend-shared-resolver' as INTERNAL__Id,
            config: {
              cache: false,
              dev: false,
              metafile: false,
              rootDir: __dirname,
              buildConfig,
            },
          },
        }),
      ],
    });

    await expect(evaluate(result.code)).resolves.toContain('Default:Linked');
  });
});
