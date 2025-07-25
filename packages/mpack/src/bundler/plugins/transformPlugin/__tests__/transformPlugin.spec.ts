import path from 'path';
import type { BuildConfig } from '@granite-js/plugin-core';
import { describe, expect, it } from 'vitest';
import { buildWithEsbuild, evaluate } from '../../../../testing';
import type { INTERNAL__Id } from '../../../../types';
import { transformPlugin } from '../transformPlugin';

describe('transformPlugin', () => {
  it('prelude 스크립트가 entry 파일 최상단에서 먼저 평가된다', async () => {
    const buildConfig: BuildConfig = {
      entry: path.resolve(__dirname, 'fixtures/entry.ts'),
      outfile: '',
      platform: 'android',
      esbuild: {
        prelude: [path.resolve(__dirname, 'fixtures/initialize.ts')],
      },
    };

    const code = await buildWithEsbuild(buildConfig, {
      plugins: [
        transformPlugin({
          context: {
            id: 'id' as INTERNAL__Id,
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

    expect(await evaluate(code)).toContain('passed');
  });
});
