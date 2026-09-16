import path from 'node:path';
import { flattenPluginOption, type Plugin, type ResolvedConfig } from 'rollipop';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from './index';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), close: vi.fn(async () => {}), watch: vi.fn() }));
vi.mock('../shared/generateRouterFile', () => ({ generateRouterFile: mocks.generate }));
vi.mock('../shared/watchRouter', () => ({ watchRouter: mocks.watch }));
afterEach(() => vi.clearAllMocks());

describe('native router plugin', () => {
  it('generates routes at config resolution and closes its dev watcher', async () => {
    mocks.watch.mockReturnValue(mocks.close);
    const config = { root: '/service' } as ResolvedConfig;
    const [generator, watcher, pageImports] = await flattenPluginOption(router());
    const context = {} as Parameters<NonNullable<Plugin['configureServer']>>[0];
    const addHook = vi.fn();
    Object.assign(context, { config, instance: { addHook } });
    await generator!.configResolved?.call({} as never, config);
    expect(mocks.generate).toHaveBeenCalledWith('/service');
    await watcher!.configureServer?.call({} as never, context);
    expect(mocks.watch).toHaveBeenCalledWith('/service');
    expect(addHook).toHaveBeenCalledWith('onClose', expect.any(Function));
    await addHook.mock.calls[0]![1]();
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(generator).not.toHaveProperty('configureServer');
    expect(watcher).not.toHaveProperty('configResolved');
    expect([generator!.name, watcher!.name, pageImports!.name]).toEqual([
      'granite:router:generate',
      'granite:router:watch',
      'granite:router:page-imports',
    ]);
  });

  it.each(['../require.context', './nested/require.context.ts', '../../require.context.generated.tsx'])(
    'replaces %s with an eager page glob',
    async (source) => {
      const plugins = await flattenPluginOption(router());
      const pageImports = plugins.find((plugin) => plugin.name === 'granite:router:page-imports')!;
      const resolveId = pageImports.resolveId;
      const load = pageImports.load;
      if (typeof resolveId !== 'object' || typeof load !== 'object') {
        throw new Error('Expected filtered page import hooks');
      }

      const id = await resolveId.handler.call({} as never, source, '/service/src/_app.tsx', {
        isEntry: false,
        kind: 'import-statement',
      } as never);
      expect(id).toBe(path.resolve('/service/src', source));
      const code = await load.handler.call({} as never, id as string);
      expect(code).toContain("import.meta.glob('./**/*.{js,jsx,ts,tsx}', { base: './pages', eager: true })");
      expect(code).toContain("id: 'pages'");
    }
  );

  it('does not replace unrelated context modules', async () => {
    const plugins = await flattenPluginOption(router());
    const pageImports = plugins.find((plugin) => plugin.name === 'granite:router:page-imports')!;
    const resolveId = pageImports.resolveId;
    if (typeof resolveId !== 'object') {
      throw new Error('Expected a filtered page import hook');
    }

    expect(resolveId.filter).toEqual({ id: expect.any(RegExp) });
    expect((resolveId.filter as { id: RegExp }).id.test('../other.context')).toBe(false);
  });
});
