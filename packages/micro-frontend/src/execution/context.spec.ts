import { describe, expect, it } from 'vitest';
import { createExecutionContext } from './context';

const tokenA = Object.freeze({ id: 'activity-a:1' });
const tokenB = Object.freeze({ id: 'activity-b:1' });

describe('execution ownership', () => {
  it('keeps runtime work distinct from explicit unowned work and service work', () => {
    const context = createExecutionContext();
    const bootstrap = context.snapshot().bind(() => context.capture());
    const unowned = context.run(null, () => context.snapshot().bind(() => context.capture()));
    context.bindRuntime({ id: 'runtime:1' });
    const runtime = context.runtimeToken;
    expect(runtime?.id).toBe('runtime:1');
    context.run(tokenA, () => {
      expect(bootstrap()).toBe(runtime);
      expect(unowned()).toBeNull();
      expect(context.runRuntime(() => context.capture())).toBe(runtime);
      expect(context.capture()).toBe(tokenA);
    });
    expect(context.capture()).toBe(runtime);
  });

  it('never replaces a runtime lifetime or mutates an explicit active scope', () => {
    const context = createExecutionContext();
    context.run(null, () => {
      context.bindRuntime({ id: 'runtime:1' });
      expect(context.capture()).toBeNull();
    });
    const runtime = context.runtimeToken;
    context.bindRuntime({ id: 'runtime:1' });
    expect(context.runtimeToken).toBe(runtime);
    expect(Object.isFrozen(runtime)).toBe(true);
    expect(() => context.bindRuntime({ id: 'runtime:2' })).toThrow('cannot be replaced');
    expect(() => createExecutionContext().bindRuntime({ id: '' })).toThrow('nonempty');
  });

  it('uses the caller of a shared function, including nested calls and exceptions', () => {
    const context = createExecutionContext();
    const shared = () => context.capture();

    context.run(tokenA, () => {
      expect(shared()).toBe(tokenA);
      expect(() =>
        context.run(tokenB, () => {
          expect(shared()).toBe(tokenB);
          throw new Error('inner failure');
        })
      ).toThrow('inner failure');
      expect(shared()).toBe(tokenA);
    });
    expect(shared()).toBeNull();
  });

  it('captures each registration of the same callback separately', () => {
    const context = createExecutionContext();
    const sharedCallback = () => context.capture();
    const callbackA = context.run(tokenA, () => context.snapshot().bind(sharedCallback));
    const callbackB = context.run(tokenB, () => context.snapshot().bind(sharedCallback));

    context.run(tokenB, () => {
      expect(callbackA()).toBe(tokenA);
      expect(context.capture()).toBe(tokenB);
    });
    expect(callbackB()).toBe(tokenB);
    expect(context.capture()).toBeNull();
  });

  it('does not inherit an unrelated caller when an unowned callback resumes', () => {
    const context = createExecutionContext();
    const callback = context.snapshot().bind(() => context.capture());
    context.run(tokenA, () => {
      expect(callback()).toBeNull();
      expect(context.capture()).toBe(tokenA);
    });
  });

  it('preserves the receiver, arguments, and result of a bound callback', () => {
    const context = createExecutionContext();
    const receiver = { prefix: 'value' };
    const callback = context.run(tokenA, () =>
      context.snapshot().bind(function (this: typeof receiver, count: number) {
        expect(context.capture()).toBe(tokenA);
        return `${this.prefix}:${count}`;
      })
    );
    expect(callback.call(receiver, 3)).toBe('value:3');
  });

  it('restores the previous execution immediately when a callback returns a Promise', async () => {
    const context = createExecutionContext();
    let complete = () => {};
    const pending = new Promise<void>((resolve) => {
      complete = resolve;
    });
    expect(context.run(tokenA, () => pending)).toBe(pending);
    expect(context.capture()).toBeNull();
    expect(context.run(tokenB, () => context.capture())).toBe(tokenB);
    complete();
    await pending;
    expect(context.capture()).toBeNull();
  });
});
