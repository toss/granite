import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { defineConfig } from '@granite-js/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rollipop } from './rollipop';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  build: vi.fn(),
  server: vi.fn(),
  close: vi.fn(),
}));
vi.mock('rollipop', async (importOriginal) => ({
  ...(await importOriginal<typeof import('rollipop')>()),
  loadConfig: mocks.load,
  runBuild: mocks.build,
  runServer: mocks.server,
}));

let cwd: string;
beforeEach(async () => {
  vi.clearAllMocks();
  cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'granite-bundlers-'));
  mocks.load.mockImplementation(async () => ({
    root: cwd,
    entry: path.join(cwd, 'index.ts'),
    prelude: [],
    polyfills: [],
    plugins: [],
    output: {},
  }));
  mocks.build.mockImplementation(async (_config, options) => {
    await fs.writeFile(options.sourcemapOutfile, '{}');
    return { code: 'globalThis.result = 42;', moduleIds: ['index.ts'] };
  });
  mocks.close.mockResolvedValue(undefined);
  mocks.server.mockResolvedValue({ instance: { close: mocks.close } });
});
afterEach(async () => {
  await fs.rm(cwd, { recursive: true, force: true });
});

function app(bundler: Parameters<typeof defineConfig>[0]['bundler']) {
  return defineConfig({ cwd, appName: 'my-app', scheme: 'granite', host: 'example', bundler });
}

describe('bundler presets', () => {
  it('loads native Rollipop config with context, then injects Granite metadata', async () => {
    mocks.load.mockImplementation(async (options) => {
      expect(options).toMatchObject({ cwd, mode: 'development', context: { command: 'bundle' } });
      return {
        root: cwd,
        entry: path.join(cwd, 'native-entry.ts'),
        prelude: [],
        polyfills: [],
        plugins: [],
        output: {},
      };
    });
    const result = await app(rollipop({ configFile: 'custom.config.ts' })).bundler.runBuild({
      platform: 'ios',
      dev: true,
      outdir: 'build',
      outfile: 'my-app.ios.js',
      extra: { tag: 'rn84' },
    });
    expect(mocks.load).toHaveBeenCalledWith(expect.objectContaining({ configFile: 'custom.config.ts' }));
    const config = mocks.build.mock.calls[0]![0];
    const scope: Record<string, unknown> = {};
    vm.runInNewContext(config.polyfills[0].code, scope);
    expect(scope.__granite).toEqual({ app: { name: 'my-app', scheme: 'granite', host: 'example' } });
    expect(result).toMatchObject({
      outfile: path.join(cwd, 'build/my-app.ios.js'),
      extra: { tag: 'rn84' },
      platform: 'ios',
    });
  });

  it('delegates native plugins unchanged without running their hooks itself', async () => {
    const plugin = { name: 'native', buildStart: vi.fn(), writeBundle: vi.fn() };
    mocks.load.mockResolvedValue({ root: cwd, entry: 'index.ts', prelude: [], polyfills: [], plugins: [plugin] });
    await app(rollipop()).bundler.runBuild({ platform: 'android', outdir: 'version', outdirSuffix: 'rn84' });
    expect(mocks.build.mock.calls[0]![0].plugins).toEqual([plugin]);
    expect(mocks.build.mock.calls[0]![1].outfile).toBe(path.join(cwd, 'version/rn84/bundle.android.js'));
    expect(plugin.buildStart).not.toHaveBeenCalled();
    expect(plugin.writeBundle).not.toHaveBeenCalled();
    expect(mocks.build).toHaveBeenCalledOnce();
    expect(mocks.server).not.toHaveBeenCalled();
  });

  it('propagates a single build failure', async () => {
    mocks.build.mockRejectedValue(new Error('failed'));
    await expect(app(rollipop()).bundler.runBuild({ platform: 'android' })).rejects.toThrow('failed');
  });

  it('forwards the dev host/port and closes the Rollipop server', async () => {
    const handle = await app(rollipop()).bundler.runServer({ port: 8082, host: '0.0.0.0', interactive: false });
    expect(mocks.server).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ port: 8082, host: '0.0.0.0' })
    );
    expect(mocks.load).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'development', context: { command: 'start' } })
    );
    expect(mocks.build).not.toHaveBeenCalled();
    await handle.close();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
