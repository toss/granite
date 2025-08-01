import path from 'path';
import type { BuildConfig } from '@granite-js/plugin-core';
import { describe, expect, it } from 'vitest';
import { buildWithEsbuild, evaluate } from '../../../../testing';
import type { INTERNAL__Id } from '../../../../types';
import { resolvePlugin } from '../resolvePlugin';

describe('resolvePlugin', () => {
  describe('alias', () => {
    describe('static alias', () => {
      it('should resolve alias 1 (string)', async () => {
        const buildConfig: BuildConfig = {
          entry: path.resolve(__dirname, 'fixtures/deps-alias/entry.ts'),
          outfile: '',
          platform: 'android',
          resolver: {
            alias: [{ from: './foo', to: './foo-2' }],
          },
        };

        const code = await buildWithEsbuild(buildConfig, {
          plugins: [
            resolvePlugin({
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

        expect(await evaluate(code)).toContain('foo 2');
      });

      it('should resolve alias 2 (object)', async () => {
        const buildConfig: BuildConfig = {
          entry: path.resolve(__dirname, 'fixtures/deps-alias/entry.ts'),
          outfile: '',
          platform: 'android',
          resolver: {
            alias: [
              {
                from: './foo',
                to: {
                  path: './foo-2',
                },
              },
            ],
          },
        };

        const code = await buildWithEsbuild(buildConfig, {
          plugins: [
            resolvePlugin({
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

        expect(await evaluate(code)).toContain('foo 2');
      });
    });

    describe('dynamic alias', () => {
      it('should resolve alias 1 (string)', async () => {
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

                  // Returns `string`
                  return result.path.replace('foo', 'foo-2');
                },
              },
            ],
          },
        };

        const code = await buildWithEsbuild(buildConfig, {
          plugins: [
            resolvePlugin({
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

        expect(await evaluate(code)).toContain('foo 2');
      });

      it('should resolve alias 2 (object)', async () => {
        const buildConfig: BuildConfig = {
          entry: path.resolve(__dirname, 'fixtures/deps-alias/entry.ts'),
          outfile: '',
          platform: 'android',
          resolver: {
            alias: [
              {
                from: './foo',
                to: async ({ args, resolve }) => {
                  // Returns `ResolveResult`
                  return resolve('./foo-2', {
                    importer: args.importer,
                    kind: args.kind,
                    resolveDir: args.resolveDir,
                  });
                },
              },
            ],
          },
        };

        const code = await buildWithEsbuild(buildConfig, {
          plugins: [
            resolvePlugin({
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

        expect(await evaluate(code)).toContain('foo 2');
      });
    });
  });

  describe('protocol', () => {
    it('should resolve custom protocol', async () => {
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
          resolvePlugin({
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

      expect(await evaluate(code)).toContain('Module source is my-module');
    });
  });
});
