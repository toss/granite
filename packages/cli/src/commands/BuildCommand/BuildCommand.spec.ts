import type { BundlerBuildOption } from '@granite-js/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BuildCommand } from './BuildCommand';

const mocks = vi.hoisted(() => ({ load: vi.fn(), runBuild: vi.fn() }));
vi.mock('@granite-js/config', () => ({ loadConfig: mocks.load }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.runBuild.mockImplementation(async (option: BundlerBuildOption) => ({ platform: option.platform }));
  mocks.load.mockResolvedValue({ bundler: { name: 'custom', runBuild: mocks.runBuild } });
});

describe('build command', () => {
  it('dispatches one adapter build per platform', async () => {
    const command = new BuildCommand();
    command.cache = true;
    command.dev = false;
    command.metafile = false;

    expect(await command.execute()).toBe(0);
    expect(mocks.runBuild).toHaveBeenCalledTimes(2);
    expect(mocks.runBuild.mock.calls.map(([option]) => option)).toEqual([
      { platform: 'android', cache: true, metafile: false, dev: false },
      { platform: 'ios', cache: true, metafile: false, dev: false },
    ]);
  });
});
