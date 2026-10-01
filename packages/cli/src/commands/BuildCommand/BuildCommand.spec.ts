import type { BundlerBuildOption } from '@granite-js/config';
import { Cli } from 'clipanion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuildCommand } from './BuildCommand';

const mocks = vi.hoisted(() => ({ load: vi.fn(), runBuild: vi.fn(), resetCache: vi.fn() }));
vi.mock('@granite-js/config', () => ({ loadConfig: mocks.load }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.runBuild.mockImplementation(async (option: BundlerBuildOption) => ({ platform: option.platform }));
  mocks.resetCache.mockResolvedValue(undefined);
  mocks.load.mockResolvedValue({ bundler: { name: 'custom', runBuild: mocks.runBuild, resetCache: mocks.resetCache } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createCommand(args: string[] = []) {
  const cli = new Cli();
  cli.register(BuildCommand);
  return cli.process(['build', ...args]) as BuildCommand;
}

describe('build command', () => {
  it.each(['--cache', '--no-cache', '--metafile'])('rejects the removed %s option', (option) => {
    expect(() => createCommand([option])).toThrow();
  });

  it('prints every platform failure and its original cause', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.runBuild.mockImplementation(async (option: BundlerBuildOption) => {
      throw new Error(`Missing dependency for ${option.platform}`);
    });

    expect(await createCommand().execute()).toBe(1);
    expect(mocks.runBuild).toHaveBeenCalledTimes(2);
    expect(log.mock.calls.map(([, message]) => message)).toEqual([
      'Granite build failed',
      'Failed to build for android',
      'Missing dependency for android',
      'Failed to build for ios',
      'Missing dependency for ios',
    ]);
  });

  it('dispatches one adapter build per platform', async () => {
    const command = createCommand();

    expect(await command.execute()).toBe(0);
    expect(mocks.runBuild).toHaveBeenCalledTimes(2);
    expect(mocks.runBuild.mock.calls.map(([option]) => option)).toEqual([
      { platform: 'android', dev: false },
      { platform: 'ios', dev: false },
    ]);
    expect(mocks.resetCache).not.toHaveBeenCalled();
  });

  it('awaits one cache reset before building either platform', async () => {
    let resetComplete = false;
    mocks.resetCache.mockImplementation(async () => {
      await Promise.resolve();
      resetComplete = true;
    });
    mocks.runBuild.mockImplementation(async () => {
      expect(resetComplete).toBe(true);
    });
    const command = createCommand(['--reset-cache']);

    expect(await command.execute()).toBe(0);
    expect(mocks.resetCache).toHaveBeenCalledOnce();
    expect(mocks.runBuild).toHaveBeenCalledTimes(2);
  });

  it('reports reset failures without starting a build', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.resetCache.mockRejectedValue(new Error('Cache reset failed'));
    const command = createCommand(['--reset-cache']);

    expect(await command.execute()).toBe(1);
    expect(mocks.runBuild).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.any(String), 'Cache reset failed');
  });
});
