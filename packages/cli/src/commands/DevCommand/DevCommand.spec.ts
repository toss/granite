import { afterEach, describe, expect, it, vi } from 'vitest';
import { DevCommand } from './DevCommand';

const mocks = vi.hoisted(() => ({ close: vi.fn(), runServer: vi.fn(), load: vi.fn() }));
vi.mock('@granite-js/config', () => ({ loadConfig: mocks.load }));
afterEach(() => vi.restoreAllMocks());

describe('development server shutdown', () => {
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
    const command = new DevCommand();
    expect(await command.execute()).toBe(0);
    const close = once.mock.calls.find(([signal]) => signal === 'SIGINT')![1];
    await close();
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('SIGTERM', close);
    expect(remove).toHaveBeenCalledWith('SIGINT', close);
    expect(exit).toHaveBeenCalledWith(failure ? 1 : 0);
  });
});
