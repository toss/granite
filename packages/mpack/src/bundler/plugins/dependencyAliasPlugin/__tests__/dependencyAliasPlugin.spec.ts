import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildWithEsbuild, evaluate } from '../../../../testing';
import { BuildConfig, INTERNAL__Id } from '../../../../types';
import { dependencyAliasPlugin } from '../dependencyAliasPlugin';

describe('dependencyAliasPlugin', () => {
  it('dependency의 alias를 설정할 수 있다.', async () => {
    const buildConfig: BuildConfig = {
      entry: path.resolve(__dirname, 'fixtures/deps-alias/entry.ts'),
      outfile: '',
      platform: 'android',
      resolver: {
        alias: [
          {
            from: './foo',
            to: async ({ args, resolve }) => {
              const result = await resolve(args.path, {
                importer: args.importer,
                kind: args.kind,
                resolveDir: args.resolveDir,
              });
              return result.path.replace('foo', 'foo-2');
            },
          },
        ],
      },
    };

    const code = await buildWithEsbuild(buildConfig, {
      plugins: [
        dependencyAliasPlugin({
          context: {
            id: 'id' as INTERNAL__Id,
            config: {
              tag: 'test',
              appName: 'test',
              scheme: 'test',
              cache: false,
              dev: false,
              metafile: false,
              rootDir: __dirname,
              buildConfig,
              services: {},
            },
          },
        }),
      ],
    });

    expect(await evaluate(code)).toContain('foo 2');
  });

  it('커스텀 프로토콜을 처리할 수 있다', async () => {
    const buildConfig: BuildConfig = {
      entry: path.resolve(__dirname, 'fixtures/protocols/entry.ts'),
      outfile: '',
      platform: 'android',
      resolver: {
        protocols: {
          'custom-protocol': {
            load: (args) => ({
              loader: 'ts',
              contents: [
                `const path = ${JSON.stringify(args.path)};`,
                'export default ["Module source is ", path].join("")',
              ].join('\n'),
            }),
          },
        },
      },
    };

    const code = await buildWithEsbuild(buildConfig, {
      plugins: [
        dependencyAliasPlugin({
          context: {
            id: 'id' as INTERNAL__Id,
            config: {
              tag: 'test',
              appName: 'test',
              scheme: 'test',
              cache: false,
              dev: false,
              metafile: false,
              rootDir: __dirname,
              buildConfig,
              services: {},
            },
          },
        }),
      ],
    });

    expect(await evaluate(code)).toContain('Module source is my-module');
  });
});
