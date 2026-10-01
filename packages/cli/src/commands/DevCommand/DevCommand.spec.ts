import { Cli } from 'clipanion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevCommand } from './DevCommand';

const mocks = vi.hoisted(() => ({ close: vi.fn(), runServer: vi.fn(), load: vi.fn(), resetCache: vi.fn() }));
vi.mock('@granite-js/config', () => ({ loadConfig: mocks.load }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resetCache.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

function createCommand(args: string[] = []) {
  const cli = new Cli();
  cli.register(DevCommand);
  return cli.process(['dev', ...args]) as DevCommand;
}

describe('development server shutdown', () => {
  it.each(['--cache', '--no-cache'])('rejects the removed %s option', (option) => {
    expect(() => createCommand([option])).toThrow();
  });

  it.each([false, true])('resets caches only when requested (reset=%s)', async (reset) => {
    let resetComplete = false;
    mocks.resetCache.mockImplementation(async () => {
      await Promise.resolve();
      resetComplete = true;
    });
    mocks.load.mockResolvedValue({ bundler: { runServer: mocks.runServer, resetCache: mocks.resetCache } });
    mocks.runServer.mockImplementation(async () => {
      expect(resetComplete).toBe(reset);
      return { close: mocks.close };
    });
    vi.spyOn(process, 'once').mockReturnValue(process);
    const command = createCommand(reset ? ['--reset-cache'] : []);

    expect(await command.execute()).toBe(0);
    expect(mocks.resetCache).toHaveBeenCalledTimes(reset ? 1 : 0);
    expect(mocks.runServer.mock.calls[0]![0]).not.toHaveProperty('cache');
  });

  it.each([false, true])('awaits adapter cleanup and exits (failure=%s)', async (failure) => {
    mocks.close.mockReset();
    if (failure) {
      mocks.close.mockRejectedValue(new Error('cleanup failed'));
    } else {
      mocks.close.mockResolvedValue(undefined);
    }
    mocks.runServer.mockResolvedValue({ close: mocks.close });
    mocks.load.mockResolvedValue({ bundler: { name: 'custom', runServer: mocks.runServer } });
    const once = vi.spyOn(process, 'once').mockReturnValue(process);
    const remove = vi.spyOn(process, 'removeListener');
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const command = createCommand();
    expect(await command.execute()).toBe(0);
    const close = once.mock.calls.find(([signal]) => signal === 'SIGINT')![1];
    await close();
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('SIGTERM', close);
    expect(remove).toHaveBeenCalledWith('SIGINT', close);
    expect(exit).toHaveBeenCalledWith(failure ? 1 : 0);
  });
});
