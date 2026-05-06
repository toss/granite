import * as p from '@clack/prompts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handlePrompts } from './handlePrompts';

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  log: {
    error: vi.fn(),
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function flushPromises() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('handlePrompts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('keeps the wrapper pending until an async task resolves', async () => {
    const deferred = createDeferred<string>();
    const wrapped = handlePrompts('Async task', () => deferred.promise);

    const result = wrapped();
    let settled = false;
    void result.then(() => {
      settled = true;
    });

    await flushPromises();

    expect(p.intro).toHaveBeenCalledWith('Async task');
    expect(settled).toBe(false);

    deferred.resolve('done');

    await expect(result).resolves.toBe('done');
    expect(settled).toBe(true);
  });

  it('normalizes a synchronous task return to an awaitable result', async () => {
    const wrapped = handlePrompts('Sync task', (left: number, right: number) => left + right);

    await expect(wrapped(2, 3)).resolves.toBe(5);
  });

  it('routes async rejection through the prompt error handler', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });
    const wrapped = handlePrompts('Rejecting task', async () => {
      throw new Error('task failed');
    });

    await expect(wrapped()).rejects.toThrow('process.exit:1');

    expect(p.log.error).toHaveBeenCalledWith('task failed');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
