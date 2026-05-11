import path from 'path';
import type { BuildConfig } from '@granite-js/plugin-core';
import type { ImportKind, Plugin } from 'esbuild';
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

        const result = await buildWithEsbuild(buildConfig, {
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

        expect(await evaluate(result.code)).toContain('foo 2');
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

        const result = await buildWithEsbuild(buildConfig, {
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

        expect(await evaluate(result.code)).toContain('foo 2');
      });

      it('should pass esbuild resolve kind to the bundled metafile', async () => {
        const kindSensitivePath = 'kind-sensitive-foo';
        let observedKind: ImportKind | undefined;
        const buildConfig: BuildConfig = {
          entry: path.resolve(__dirname, 'fixtures/resolver-results/entry.ts'),
          outfile: '',
          platform: 'android',
          resolver: {
            alias: [
              {
                from: './foo',
                to: {
                  // 'foo' is written by TypeScript, so default kind is 'import-statement'.
                  path: kindSensitivePath,
                  kind: 'require-call',
                },
              },
            ],
          },
        };
        const kindSensitiveResolver: Plugin = {
          name: 'kind-sensitive-fixture-resolver',
          setup(build) {
            build.onResolve({ filter: new RegExp(`^${kindSensitivePath}$`) }, (args) => {
              observedKind = args.kind;

              return {
                path: path.resolve(
                  __dirname,
                  args.kind === 'require-call'
                    ? 'fixtures/resolver-results/packages/foo/cjs.cjs'
                    : 'fixtures/resolver-results/packages/foo/esm.ts'
                ),
              };
            });
          },
        };

        const result = await buildWithEsbuild(buildConfig, {
          format: 'cjs',
          metafile: true,
          platform: 'node',
          plugins: [
            resolvePlugin({
              context: {
                id: 'id' as INTERNAL__Id,
                config: {
                  cache: false,
                  dev: false,
                  metafile: true,
                  rootDir: __dirname,
                  buildConfig,
                },
              },
            }),
            kindSensitiveResolver,
          ],
        });

        const inputPaths = Object.keys(result.metafile?.inputs ?? {});
        const fooInput = Object.entries(result.metafile?.inputs ?? {}).find(([inputPath]) =>
          inputPath.endsWith('fixtures/resolver-results/packages/foo/cjs.cjs')
        )?.[1];
        const barImport = fooInput?.imports.find((imported) =>
          imported.path.endsWith('fixtures/resolver-results/packages/foo/bar-cjs.cjs')
        );
        const hasEsmFooInput = inputPaths.some((inputPath) =>
          inputPath.endsWith('fixtures/resolver-results/packages/foo/esm.ts')
        );

        expect(observedKind).toBe('require-call');
        expect(hasEsmFooInput).toBe(false);
        expect(await evaluate(result.code)).toContain('entry cjs bar');
        expect(fooInput?.format).toBe('cjs');
        expect(barImport?.kind).toBe('require-call');
      });

      it('should pass esbuild onResolve result options to the bundle', async () => {
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
                  external: true,
                },
              },
            ],
          },
        };

        const result = await buildWithEsbuild(buildConfig, {
          format: 'cjs',
          metafile: true,
          platform: 'node',
          plugins: [
            resolvePlugin({
              context: {
                id: 'id' as INTERNAL__Id,
                config: {
                  cache: false,
                  dev: false,
                  metafile: true,
                  rootDir: __dirname,
                  buildConfig,
                },
              },
            }),
          ],
        });

        const inputPaths = Object.keys(result.metafile?.inputs ?? {});
        const outputImports = Object.values(result.metafile?.outputs ?? {}).flatMap((output) => output.imports);

        expect(inputPaths.some((inputPath) => inputPath.endsWith('fixtures/deps-alias/foo-2.ts'))).toBe(false);
        expect(outputImports).toContainEqual(expect.objectContaining({ external: true }));
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

        const result = await buildWithEsbuild(buildConfig, {
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

        expect(await evaluate(result.code)).toContain('foo 2');
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

        const result = await buildWithEsbuild(buildConfig, {
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

        expect(await evaluate(result.code)).toContain('foo 2');
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

      const result = await buildWithEsbuild(buildConfig, {
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

      expect(await evaluate(result.code)).toContain('Module source is my-module');
    });
  });
});
