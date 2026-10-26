import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { installAsyncBoundaries } from './asyncBoundaries';
import { createExecutionContext } from './context';

function createEnvironment() {
  const promise: PromiseConstructor = runInNewContext('Promise');
  const pending: Array<() => void> = [];
  const target = {
    Promise: promise,
    setTimeout(callback: (...args: unknown[]) => unknown, _delay: number, ...args: unknown[]) {
      pending.push(() => callback(...args));
      return pending.length;
    },
    queueMicrotask(callback: () => void) {
      pending.push(callback);
    },
  };
  return { target, pending };
}

describe('async boundary installation', () => {
  it('captures timer registrations separately even when they reuse one callback', () => {
    const context = createExecutionContext();
    const { target, pending } = createEnvironment();
    const dispose = installAsyncBoundaries(context, target);
    const tokenA = { id: 'a:1' };
    const tokenB = { id: 'b:1' };
    const seen: unknown[] = [];
    const callback = (argument: unknown) => seen.push([context.capture(), argument]);
    expect(context.run(tokenA, () => target.setTimeout(callback, 0, 'first'))).toBe(1);
    expect(context.run(tokenB, () => target.setTimeout(callback, 0, 'second'))).toBe(2);
    context.run(tokenB, () => pending[0]?.());
    context.run(tokenA, () => pending[1]?.());
    expect(seen).toEqual([
      [tokenA, 'first'],
      [tokenB, 'second'],
    ]);
    expect(context.capture()).toBeNull();
    dispose();
  });

  it('uses the Promise subscriber owner rather than the resolver owner', async () => {
    const context = createExecutionContext();
    const { target } = createEnvironment();
    const dispose = installAsyncBoundaries(context, target);
    const tokenA = { id: 'a:1' };
    const tokenB = { id: 'b:1' };
    let resolve!: (value: string) => void;
    const sharedPromise = new target.Promise<string>((complete) => {
      resolve = complete;
    });
    const first = context.run(tokenA, () => sharedPromise.then(() => context.capture()));
    const second = context.run(tokenB, () => sharedPromise.then(() => context.capture()));
    context.run(tokenB, () => resolve('done'));
    expect(await first).toBe(tokenA);
    expect(await second).toBe(tokenB);
    expect(context.capture()).toBeNull();
    dispose();
  });

  it('preserves unowned microtasks and restores the surrounding execution on exceptions', () => {
    const context = createExecutionContext();
    const { target, pending } = createEnvironment();
    const dispose = installAsyncBoundaries(context, target);
    target.queueMicrotask(() => {
      expect(context.capture()).toBeNull();
      throw new Error('expected');
    });
    const token = { id: 'a:1' };
    context.run(token, () => {
      expect(() => pending[0]?.()).toThrow('expected');
      expect(context.capture()).toBe(token);
    });
    dispose();
  });

  it('installs idempotently and restores original functions without removing later instrumentation', () => {
    const context = createExecutionContext();
    const { target } = createEnvironment();
    const originalThen = target.Promise.prototype.then;
    const originalTimer = target.setTimeout;
    const dispose = installAsyncBoundaries(context, target);
    const wrappedTimer = target.setTimeout;
    expect(installAsyncBoundaries(context, target)).toBe(dispose);
    expect(target.setTimeout).toBe(wrappedTimer);
    expect(() => installAsyncBoundaries(createExecutionContext(), target)).toThrow('another context');
    const laterTimer = () => 99;
    target.setTimeout = laterTimer;
    dispose();
    dispose();
    expect(target.Promise.prototype.then).toBe(originalThen);
    expect(target.setTimeout).toBe(laterTimer);
    expect(target.setTimeout).not.toBe(originalTimer);
  });

  it('rolls back earlier patches if a scheduler cannot be replaced', () => {
    const context = createExecutionContext();
    const { target } = createEnvironment();
    const originalThen = target.Promise.prototype.then;
    Object.defineProperty(target, 'setTimeout', { writable: false, configurable: false });
    expect(() => installAsyncBoundaries(context, target)).toThrow();
    expect(target.Promise.prototype.then).toBe(originalThen);
  });
});
