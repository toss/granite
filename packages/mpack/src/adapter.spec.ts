import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from '@granite-js/config';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { mpack, type MpackConfigFileOptions, type MpackInlineOptions, type MpackOptions } from './adapter';
import type { MpackConfig } from './config';

const mocks = vi.hoisted(() => ({ build: vi.fn(), server: vi.fn(), close: vi.fn() }));
vi.mock('./operations/build', () => ({ build: mocks.build }));
vi.mock('./operations/serve', () => ({ runServer: mocks.server }));
vi.mock('./plugins', () => ({ statusPlugin: () => ({ name: 'status' }) }));

let cwd: string;
let previousDevServer: string | undefined;
beforeEach(async () => {
  vi.clearAllMocks();
  previousDevServer = process.env.MPACK_DEV_SERVER;
  delete process.env.MPACK_DEV_SERVER;
  cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'granite-mpack-config-'));
  mocks.build.mockImplementation(async ({ platform, outfile }) => ({
    errors: [],
    warnings: [],
    bundle: { source: {}, sourcemap: {} },
    outfile,
    sourcemapOutfile: `${outfile}.map`,
    platform,
    extra: undefined,
    totalModuleCount: 0,
    duration: 0,
    size: 0,
  }));
  mocks.server.mockResolvedValue({
    close: (callback: () => void) => {
      mocks.close();
      callback();
    },
  });
});
afterEach(async () => {
  if (previousDevServer == null) {
    delete process.env.MPACK_DEV_SERVER;
  } else {
    process.env.MPACK_DEV_SERVER = previousDevServer;
  }
  await fs.rm(cwd, { recursive: true, force: true });
});

function app(options?: MpackOptions) {
  return defineConfig({ cwd, appName: 'my-app', scheme: 'granite', host: 'example', bundler: mpack(options) });
}

describe('Mpack config adapter', () => {
  it.each(['ts', 'js', 'mjs', 'cjs'])('loads mpack.config.%s and keeps legacy plugins', async (extension) => {
    const prefix = extension === 'cjs' ? 'module.exports =' : 'export default';
    await fs.writeFile(
      path.join(cwd, `mpack.config.${extension}`),
      `${prefix} {
      entryFile: './legacy.ts', outdir: 'build',
      plugins: [{ name: 'raw', config: { esbuild: { minify: false } }, build: { order: 'pre', handler() {} } }],
      metro: { resolver: { sourceExts: ['js'] } }, devServer: { port: 9000 }
    };`
    );
    await app().bundler.runBuild({ platform: 'ios', extra: { version: 'rn84' }, outdirSuffix: 'rn84' });
    const [{ config }] = mocks.build.mock.calls[0]!;
    expect(mocks.build).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'ios', outfile: 'bundle.ios.js', dev: false, cache: true, metafile: false })
    );
    expect(config.entryFile).toBe(path.join(cwd, 'legacy.ts'));
    expect(config.outdir).toBe(path.join(cwd, 'build/rn84'));
    expect(config.pluginConfigs).toContainEqual(expect.objectContaining({ esbuild: { minify: false } }));
    expect(config.pluginHooks.build.preHandlers).toHaveLength(1);
    expect(config.pluginConfigs).toContainEqual({ extra: { version: 'rn84' } });
  });

  it('supports a custom config path and asynchronous factories', async () => {
    await fs.writeFile(
      path.join(cwd, 'custom.mpack.ts'),
      `export default async (context) => {
      await Promise.resolve();
      return { entryFile: context.appName + '.ts', build: { extra: { command: context.command, mode: context.mode, host: context.host } } };
    };`
    );
    mocks.build.mockImplementation(async ({ config, platform, outfile }) => {
      expect(config.entryFile).toBe(path.join(cwd, 'my-app.ts'));
      expect(config.pluginConfigs[0].extra).toEqual({ command: 'build', mode: 'development', host: 'example' });
      return { platform, outfile };
    });
    await app({ config: 'custom.mpack.ts' }).bundler.runBuild({ platform: 'ios', dev: true });
  });

  it.each([{}, { config: undefined }])('loads the default file with empty file options %j', async (options) => {
    await fs.writeFile(path.join(cwd, 'mpack.config.ts'), 'export default { entryFile: "./default.ts" };');
    await app(options).bundler.runBuild({ platform: 'ios' });
    expect(mocks.build.mock.calls[0]![0].config.entryFile).toBe(path.join(cwd, 'default.ts'));
  });

  it.each(['missing', 'throws'])('builds with inline options when the default file %s', async (file) => {
    if (file === 'throws') {
      await fs.writeFile(path.join(cwd, 'mpack.config.ts'), 'throw new Error("Config must not be loaded");');
    }
    const hook = vi.fn();
    const buildPlugin = () => ({ name: 'inline-build-plugin' });
    await app({
      entryFile: './inline.ts',
      outdir: 'inline-dist',
      build: { esbuild: { minify: false } },
      plugins: [{ name: 'inline', build: { order: 'pre', handler: hook } }],
      buildPlugins: [buildPlugin],
    }).bundler.runBuild({ platform: 'ios', outdirSuffix: 'rn84', extra: { version: 'rn84' } });

    const [{ config, plugins }] = mocks.build.mock.calls[0]!;
    expect(mocks.build).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'ios', outfile: 'bundle.ios.js', dev: false, cache: true, metafile: false })
    );
    expect(config.entryFile).toBe(path.join(cwd, 'inline.ts'));
    expect(config.outdir).toBe(path.join(cwd, 'inline-dist/rn84'));
    expect(config.pluginConfigs).toContainEqual(expect.objectContaining({ esbuild: { minify: false } }));
    expect(config.pluginConfigs).toContainEqual({ extra: { version: 'rn84' } });
    expect(config.pluginHooks.build.preHandlers).toHaveLength(1);
    expect(plugins).toContain(buildPlugin);
  });

  it.each([{ build: {} }, { plugins: [] }, { buildPlugins: [] }, { metro: {} }, { devServer: {} }])(
    'does not require a config file for inline options %j',
    async (options) => {
      await app(options).bundler.runBuild({ platform: 'ios' });
      expect(mocks.build).toHaveBeenCalledOnce();
    }
  );

  it('loads a custom dev configuration with the serve context', async () => {
    await fs.writeFile(
      path.join(cwd, 'custom.mpack.ts'),
      'export default async ({ command, mode }) => ({ entryFile: command + "." + mode + ".ts" });'
    );
    const handle = await app({ config: 'custom.mpack.ts' }).bundler.runServer({});
    expect(mocks.server.mock.calls[0]![0].config.entryFile).toBe(path.join(cwd, 'serve.development.ts'));
    await handle.close();
  });

  it('keeps the legacy Mpack dev-server marker active until the server closes', async () => {
    await fs.writeFile(
      path.join(cwd, 'mpack.config.ts'),
      `export default { entryFile: process.env.MPACK_DEV_SERVER === 'true' ? 'serve.ts' : 'missing.ts' };`
    );

    const handle = await app().bundler.runServer({});
    expect(mocks.server.mock.calls[0]![0].config.entryFile).toBe(path.join(cwd, 'serve.ts'));
    expect(process.env.MPACK_DEV_SERVER).toBe('true');

    await handle.close();
    expect(process.env.MPACK_DEV_SERVER).toBeUndefined();
  });

  it('serves inline Metro options without reading the default file', async () => {
    await fs.writeFile(path.join(cwd, 'mpack.config.ts'), 'throw new Error("Config must not be loaded");');
    const handle = await app({
      entryFile: './inline.ts',
      metro: { resolver: { sourceExts: ['tsx'] } },
      devServer: { middlewares: [] },
    }).bundler.runServer({ port: 8083, interactive: false });
    expect(mocks.server).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 8083,
        interactive: false,
        config: expect.objectContaining({ entryFile: path.join(cwd, 'inline.ts') }),
      })
    );
    expect(mocks.server.mock.calls[0]![0].config.pluginConfigs).toContainEqual(
      expect.objectContaining({
        metro: { resolver: { sourceExts: ['tsx'] } },
        devServer: { middlewares: [] },
      })
    );
    await handle.close();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it('rejects mixed file and inline options in JavaScript too', () => {
    const mixed = { config: 'custom.mpack.ts', build: {} };
    // @ts-expect-error File selection cannot be combined with inline configuration.
    expect(() => mpack(mixed)).toThrow(/cannot.*combin/i);
  });

  it('exposes mutually exclusive file and inline option types', () => {
    expectTypeOf<MpackConfigFileOptions>().toMatchTypeOf<MpackOptions>();
    expectTypeOf<MpackInlineOptions>().toMatchTypeOf<MpackOptions>();
    expectTypeOf<MpackConfig>().toMatchTypeOf<MpackInlineOptions>();
    expectTypeOf<MpackInlineOptions>().toMatchTypeOf<MpackConfig>();
    expectTypeOf<{ config: string }>().toMatchTypeOf<MpackConfigFileOptions>();
    expectTypeOf<{ build: { esbuild: { minify: false } } }>().toMatchTypeOf<MpackInlineOptions>();
    expectTypeOf<{ config: string; build: { esbuild: { minify: false } } }>().not.toMatchTypeOf<MpackOptions>();
    expectTypeOf<{ config: string; metro: { resolver: { sourceExts: ['ts'] } } }>().not.toMatchTypeOf<MpackOptions>();
    expectTypeOf<{ config: string; plugins: [] }>().not.toMatchTypeOf<MpackOptions>();
    expectTypeOf<{ config: string; buildPlugins: [] }>().not.toMatchTypeOf<MpackOptions>();
    expectTypeOf<{ configFile: string }>().not.toMatchTypeOf<MpackOptions>();
  });

  it('fails clearly when the config is missing', async () => {
    await expect(app().bundler.runBuild({ platform: 'ios' })).rejects.toThrow(/config/i);
    expect(mocks.build).not.toHaveBeenCalled();
  });

  it('loads dev configuration and returns a closeable Metro server', async () => {
    await fs.writeFile(
      path.join(cwd, 'mpack.config.ts'),
      'export default ({command}) => ({entryFile: command + ".ts"});'
    );
    const handle = await app().bundler.runServer({ port: 8083, interactive: false });
    expect(mocks.server).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 8083,
        interactive: false,
        config: expect.objectContaining({ entryFile: path.join(cwd, 'serve.ts') }),
      })
    );
    await handle.close();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
