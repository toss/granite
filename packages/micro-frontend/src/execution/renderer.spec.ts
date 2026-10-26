import { beforeEach, describe, expect, it } from 'vitest';
import { getExecutionContext, type ExecutionToken } from './context';
import { attachRef, bindEffect, bindFiberListener, detachRef, runWithFiber } from './renderer';
import { SESSION_EXECUTION_TOKEN } from './sessions';
import { getMicroFrontendGlobalContext } from '../runtime/globalContext';

function fixture() {
  const global = getMicroFrontendGlobalContext();
  let provider: unknown = Reflect.get(global, 'microFrontendSessionContext');
  if (provider == null) {
    provider = {};
    Object.defineProperty(global, 'microFrontendSessionContext', { value: provider });
  }
  const tokenA = Object.freeze({ id: 'a:1' });
  const tokenB = Object.freeze({ id: 'b:1' });
  const parent = (token: ExecutionToken) => ({
    type: provider,
    pendingProps: { value: { [SESSION_EXECUTION_TOKEN]: token } },
    memoizedProps: { value: { [SESSION_EXECUTION_TOKEN]: token } },
    return: null,
  });
  const fiberA = { return: parent(tokenA) };
  const fiberB = { return: parent(tokenB) };
  return { tokenA, tokenB, fiberA, fiberB, context: getExecutionContext() };
}

describe('React execution boundaries', () => {
  beforeEach(() => { Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__'); });

  it('uses the runtime owner only for a known root outside a service provider', () => {
    const { tokenA, fiberA, context } = fixture();
    context.bindRuntime({ id: 'runtime:1' });
    const root = { tag: 3, return: null };
    const sharedFiber = { return: root };
    expect(runWithFiber(sharedFiber, () => context.capture())).toBe(context.runtimeToken);
    expect(runWithFiber(fiberA, () => context.capture())).toBe(tokenA);
    expect(runWithFiber({ return: null }, () => context.capture())).toBeNull();
    const detached: { return: unknown } = { return: fiberA.return };
    runWithFiber(detached, () => undefined);
    detached.return = null;
    expect(runWithFiber(detached, () => context.capture())).toBe(tokenA);
  });

  it('assigns one shared component function by its Fiber rather than its function identity', () => {
    const { tokenA, tokenB, fiberA, fiberB, context } = fixture();
    const shared = () => context.capture();
    expect(runWithFiber(fiberA, shared, true)).toBe(tokenA);
    expect(runWithFiber(fiberB, shared, true)).toBe(tokenB);
    expect(context.capture()).toBeNull();
  });

  it('keeps each listener registration owned even when a shared dispatch invokes it under another Fiber', () => {
    const { tokenA, tokenB, fiberA, fiberB, context } = fixture();
    const shared = () => context.capture();
    const first = bindFiberListener(fiberA, () => shared) as () => unknown;
    const second = bindFiberListener(fiberB, () => shared) as () => unknown;
    expect(runWithFiber(fiberB, first)).toBe(tokenA);
    expect(runWithFiber(fiberA, second)).toBe(tokenB);
    expect(context.capture()).toBeNull();
  });

  it('retains the registration owner for both effect and cleanup after the provider changes', () => {
    const { tokenA, tokenB, fiberA, fiberB, context } = fixture();
    const seen: unknown[] = [];
    const effect = runWithFiber(fiberA, () => bindEffect(() => {
      seen.push(context.capture());
      return () => seen.push(context.capture());
    }), true);
    fiberA.return.memoizedProps.value[SESSION_EXECUTION_TOKEN] = tokenB;
    const cleanup = runWithFiber(fiberB, effect) as () => void;
    runWithFiber(fiberB, cleanup);
    expect(seen).toEqual([tokenA, tokenA]);
  });

  it('uses committed props for events and pending props only while rendering', () => {
    const { tokenA, tokenB, fiberA, context } = fixture();
    fiberA.return.pendingProps.value[SESSION_EXECUTION_TOKEN] = tokenB;
    expect(runWithFiber(fiberA, () => context.capture())).toBe(tokenA);
    expect(runWithFiber(fiberA, () => context.capture(), true)).toBe(tokenB);
  });

  it('retains ref cleanup ownership and restores a surrounding scope on failure', () => {
    const { tokenA, tokenB, fiberA, context } = fixture();
    attachRef(fiberA, () => expect(context.capture()).toBe(tokenA));
    fiberA.return.memoizedProps.value[SESSION_EXECUTION_TOKEN] = tokenB;
    context.run(tokenB, () => {
      expect(() => detachRef(fiberA, () => {
        expect(context.capture()).toBe(tokenA);
        throw new Error('ref failure');
      })).toThrow('ref failure');
      expect(context.capture()).toBe(tokenB);
    });
  });

  it('clears ambient ownership when entering a Fiber outside any session', () => {
    const { tokenA, context } = fixture();
    context.run(tokenA, () => expect(runWithFiber({ return: null }, () => context.capture())).toBeNull());
  });

  it('retains ref ownership when React swaps to the alternate Fiber without attaching again', () => {
    const { tokenA, tokenB, fiberA, fiberB, context } = fixture();
    attachRef(fiberA, () => undefined);
    const alternate = { return: fiberB.return, alternate: fiberA };
    expect(runWithFiber(alternate, () => context.capture())).toBe(tokenB);
    expect(detachRef(alternate, () => context.capture())).toBe(tokenA);
  });
});
