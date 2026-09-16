import { describe, expect, it, vi } from 'vitest';
import type { BundlerAdapter, BundlerAdapterContext } from './bundler';
import { defineConfig } from '../defineConfig';
import type { BuildSuccessResult } from '../result';

function adapter(): BundlerAdapter {
  return {
    name: 'custom',
    runBuild: vi.fn(async (option) => createBuildResult(option.platform)),
    runServer: vi.fn(async () => ({ close: async () => {} })),
  };
}

function createBuildResult(platform: 'android' | 'ios'): BuildSuccessResult {
  return {
    errors: [],
    warnings: [],
    outputFiles: undefined,
    metafile: undefined,
    mangleCache: undefined,
    bundle: { source: {} as never, sourcemap: {} as never },
    outfile: `bundle.${platform}.js`,
    sourcemapOutfile: `bundle.${platform}.js.map`,
    platform,
    extra: undefined,
    totalModuleCount: 0,
    duration: 0,
    size: 0,
  };
}

describe('bundler configuration', () => {
  it('dispatches custom adapters with immutable application context', async () => {
    const impl = adapter();
    impl.runBuild = vi.fn(async function (this: BundlerAdapterContext, option) {
      expect(this.getContext()).toEqual({ cwd: '/fixture', appName: 'my-app', scheme: 'granite', host: 'example' });
      expect(Object.isFrozen(this.getContext())).toBe(true);
      return createBuildResult(option.platform);
    });
    const config = await defineConfig({
      cwd: '/fixture',
      appName: 'my-app',
      scheme: 'granite',
      host: 'example',
      bundler: impl,
    });
    await config.bundler.runBuild({ platform: 'ios', dev: true });
    expect(impl.runBuild).toHaveBeenCalledWith({ platform: 'ios', dev: true });
    expect(config.bundler).not.toHaveProperty('getContext');
    expect(impl).not.toHaveProperty('getContext');
  });

  it('isolates concurrent builds and restores context after rejection', async () => {
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = await defineConfig({
      appName: 'first',
      scheme: 'test',
      bundler: {
        ...adapter(),
        async runBuild() {
          await ready;
          expect(this.getContext().appName).toBe('first');
          throw new Error('build failed');
        },
      },
    });
    const second = await defineConfig({
      appName: 'second',
      scheme: 'test',
      bundler: {
        ...adapter(),
        async runBuild(option) {
          expect(this.getContext().appName).toBe('second');
          release();
          await Promise.resolve();
          expect(this.getContext().appName).toBe('second');
          return createBuildResult(option.platform);
        },
      },
    });
    const results = await Promise.allSettled([
      first.bundler.runBuild({ platform: 'ios' }),
      second.bundler.runBuild({ platform: 'android' }),
    ]);
    expect(results.map((result) => result.status)).toEqual(['rejected', 'fulfilled']);
    expect(first.bundler).not.toHaveProperty('getContext');
  });

  it('keeps context available while closing a dev server', async () => {
    const close = vi.fn();
    const config = await defineConfig({
      appName: 'dev',
      scheme: 'test',
      bundler: {
        ...adapter(),
        async runServer() {
          expect(this.getContext().appName).toBe('dev');
          const getContext = this.getContext;
          return {
            async close() {
              expect(getContext().appName).toBe('dev');
              close();
            },
          };
        },
      },
    });
    const server = await config.bundler.runServer({ port: 8081 });
    await server.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not overwrite context when reusing an adapter across applications', async () => {
    const impl: BundlerAdapter = {
      ...adapter(),
      async runBuild(option) {
        const before = this.getContext();
        await Promise.resolve();
        expect(this.getContext()).toBe(before);
        seen.push(before.appName);
        return createBuildResult(option.platform);
      },
    };
    const seen: string[] = [];
    const first = defineConfig({ appName: 'first', scheme: 'granite', bundler: impl });
    const second = defineConfig({ appName: 'second', scheme: 'granite', bundler: impl });
    const runBuild = first.bundler.runBuild;
    await Promise.all([runBuild({ platform: 'ios' }), second.bundler.runBuild({ platform: 'android' })]);
    expect(seen).toEqual(['first', 'second']);
    expect(impl).not.toHaveProperty('getContext');
  });

  it('rejects old selectors and top-level bundler options', async () => {
    for (const invalid of [
      { bundler: 'rollipop' },
      { bundler: adapter(), plugins: [] },
      { bundler: adapter(), entryFile: './index.ts' },
      { bundler: { name: 'missing-methods' } },
    ]) {
      await expect(
        Promise.resolve().then(() => defineConfig({ appName: 'test', scheme: 'test', ...invalid } as never))
      ).rejects.toThrow();
    }
  });
});
