import { flattenPluginOption, resolvePluginConfig, type Config, type Plugin } from 'rollipop';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hermes } from './index';

const mocks = vi.hoisted(() => ({
  compileHbc: vi.fn(),
  resolveHermesBinaryPath: vi.fn(() => '/service/hermesc'),
  writeComposedSourcemap: vi.fn(),
}));

vi.mock('../shared/compileHbc', () => ({ compileHbc: mocks.compileHbc }));
vi.mock('../shared/composeSourcemap', () => ({ writeComposedSourcemap: mocks.writeComposedSourcemap }));
vi.mock('../shared/resolveHermesBinaryPath', () => ({
  resolveHermesBinaryPath: mocks.resolveHermesBinaryPath,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.compileHbc.mockResolvedValue({ hbc: '/service/bundle.hbc', hbcSourcemap: null });
});

describe('Hermes plugin', () => {
  it('keeps JavaScript unminified and skips compilation in development', async () => {
    const option = hermes();
    const plugins = await flattenPluginOption(option);
    const config = await resolvePluginConfig({ root: '/service' } as Config, plugins);

    expect(config.output?.minify).toBe(false);
    const result = await resolveRolldownOptions(config, true, 'ios');
    expect(result.input?.plugins).toBeUndefined();

    await callWriteBundle(plugins, 'bundle.js');
    await callWriteBundle(plugins, 'bundle.js');
    expect(mocks.compileHbc).not.toHaveBeenCalled();
  });

  it.each(['ios', 'android'] as const)('compiles %s from a direct sequential pre-write hook', async (platform) => {
    const onBuild = vi.fn();
    const option = hermes({ onBuild });
    const plugins = await flattenPluginOption(option);
    const config = await resolvePluginConfig({ root: '/service' } as Config, plugins);

    const result = await resolveRolldownOptions(config, false, platform);
    expect(result.input?.plugins).toBeUndefined();
    expect(plugins.map(({ name }) => name)).toEqual(['granite:hermes:config', 'granite:hermes:compile']);

    const compiler = plugins[1]!;
    expect(compiler.writeBundle).toMatchObject({ order: 'pre', sequential: true });
    await callWriteBundle(plugins, 'bundle.js');

    expect(mocks.compileHbc).toHaveBeenCalledWith(
      expect.objectContaining({ hermesc: '/service/hermesc', jsBundle: '/service/bundle.js' })
    );
    expect(onBuild).toHaveBeenCalledWith(expect.objectContaining({ platform, outfile: '/service/bundle.js' }));
  });
});

async function resolveRolldownOptions(config: Config, dev: boolean, platform: string) {
  if (typeof config.rolldownOptions !== 'function') {
    throw new Error('Missing native options hook');
  }
  return config.rolldownOptions({ output: { file: 'bundle.js' } }, { dev, platform } as never);
}

async function callWriteBundle(plugins: Plugin[], file: string) {
  const hook = plugins.find(({ name }) => name === 'granite:hermes:compile')?.writeBundle;
  if (hook == null || typeof hook === 'function') {
    throw new Error('Missing ordered writeBundle hook');
  }
  await hook.handler.call({} as never, { file } as never, {});
}
