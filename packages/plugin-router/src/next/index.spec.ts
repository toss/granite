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
    const plugins = await flattenPluginOption(router());
    const [generator, watcher] = plugins;
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
    expect(plugins.map((plugin) => plugin.name)).toEqual(['granite:router:generate', 'granite:router:watch']);
  });

  it('does not resolve, load or transform page modules', async () => {
    const plugins = await flattenPluginOption(router());
    for (const plugin of plugins) {
      expect(plugin).not.toHaveProperty('resolveId');
      expect(plugin).not.toHaveProperty('load');
      expect(plugin).not.toHaveProperty('transform');
    }
  });
});
