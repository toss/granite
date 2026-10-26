import { describe, expect, it } from 'vitest';
import { createAsyncToGenerator } from './asyncToGenerator';
import { createExecutionContext } from './context';

function deferred() {
  return Promise.withResolvers<unknown>();
}

describe('async continuation ownership', () => {
  it('keeps concurrent calls through the same helper separate when resumed out of order', async () => {
    const context = createExecutionContext();
    const lowerAsync = createAsyncToGenerator(context);
    const tokenA = Object.freeze({ id: 'activity-a:1' });
    const tokenB = Object.freeze({ id: 'activity-b:1' });
    const gateA = deferred();
    const gateB = deferred();
    const seen: string[] = [];
    const helper = lowerAsync(function* (gate: Promise<unknown>) {
      yield gate;
      seen.push(context.capture()?.id ?? 'unowned');
      yield 42;
      return context.capture();
    });

    const pendingA = context.run(tokenA, () => helper(gateA.promise));
    const pendingB = context.run(tokenB, () => helper(gateB.promise));
    expect(context.capture()).toBeNull();
    context.run(tokenA, () => gateB.resolve('B'));
    expect(await pendingB).toBe(tokenB);
    context.run(tokenB, () => gateA.resolve('A'));
    expect(await pendingA).toBe(tokenA);
    expect(seen).toEqual(['activity-b:1', 'activity-a:1']);
    expect(context.capture()).toBeNull();
  });

  it('restores the owner in catch and finally without leaking to the Promise consumer', async () => {
    const context = createExecutionContext();
    const lowerAsync = createAsyncToGenerator(context);
    const token = Object.freeze({ id: 'activity-a:1' });
    const gate = deferred();
    const seen: unknown[] = [];
    const helper = lowerAsync(function* () {
      try {
        yield gate.promise;
      } catch (error) {
        seen.push(error, context.capture());
        yield null;
      } finally {
        seen.push(context.capture());
      }
      return 'finished';
    });

    const pending = context.run(token, helper);
    gate.reject('expected failure');
    expect(await pending).toBe('finished');
    expect(seen).toEqual(['expected failure', token, token]);
    expect(context.capture()).toBeNull();
  });

  it('keeps an unowned preload unowned when its await finishes inside another execution', async () => {
    const context = createExecutionContext();
    const lowerAsync = createAsyncToGenerator(context);
    const gate = deferred();
    const preload = lowerAsync(function* () {
      yield gate.promise;
      return context.capture();
    });
    const pending = preload();
    context.run({ id: 'activity-b:1' }, () => gate.resolve(undefined));
    expect(await pending).toBeNull();
  });

  it('preserves this, arguments, non-Promise awaits, and thenable adoption', async () => {
    const context = createExecutionContext();
    const lowerAsync = createAsyncToGenerator(context);
    const helper = lowerAsync(function* (this: { offset: number }, value: number) {
      const increment = yield { then: (resolve: (value: number) => void) => resolve(value) };
      yield undefined;
      return this.offset + Number(increment);
    });
    expect(await helper.call({ offset: 7 }, 5)).toBe(12);
  });
});
