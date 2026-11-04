import { getExecutionContext, type ExecutionToken } from './context';
import { SESSION_EXECUTION_TOKEN } from './sessions';
import { getMicroFrontendGlobalContext } from '../runtime/globalContext';

const retainedOwners = new WeakMap<object, ExecutionToken | null>();
const refOwners = new WeakMap<object, ExecutionToken | null>();

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function executionOfFiber(fiber: unknown, rendering: boolean): ExecutionToken | null {
  const context: unknown = Reflect.get(getMicroFrontendGlobalContext(), 'microFrontendSessionContext');
  let cursor = fiber;
  while (isObject(cursor)) {
    const type: unknown = Reflect.get(cursor, 'type');
    if (isObject(context) && (type === context || (isObject(type) && Reflect.get(type, '_context') === context))) {
      const props: unknown = Reflect.get(cursor, rendering ? 'pendingProps' : 'memoizedProps');
      const value: unknown = isObject(props) ? Reflect.get(props, 'value') : null;
      const token: unknown = isObject(value) ? Reflect.get(value, SESSION_EXECUTION_TOKEN) : null;
      if (token == null) {
        return null;
      }
      if (!isObject(token) || typeof Reflect.get(token, 'id') !== 'string') {
        throw new Error('Invalid session execution token in React provider');
      }
      return token as ExecutionToken;
    }
    // HostRoot in the supported Fabric renderer profile. Unknown detached
    // fibers must not acquire runtime ownership merely because they lack a provider.
    if (Reflect.get(cursor, 'tag') === 3) {
      return getExecutionContext().runtimeToken;
    }
    cursor = Reflect.get(cursor, 'return');
  }
  // Deletion can detach the parent chain before a retained cleanup executes.
  return isObject(fiber) ? retainedOwners.get(fiber) ?? null : null;
}

export function runWithFiber<TResult>(fiber: unknown, callback: () => TResult, rendering = false): TResult {
  const token = executionOfFiber(fiber, rendering);
  if (isObject(fiber)) {
    retainedOwners.set(fiber, token);
  }
  return getExecutionContext().run(token, callback);
}

/** Listener lookup can be followed by an arbitrary responder/plugin dispatch path. */
export function bindFiberListener(fiber: unknown, getListener: () => unknown): unknown {
  return runWithFiber(fiber, () => {
    const listener = getListener();
    if (typeof listener !== 'function') {
      return listener;
    }
    const snapshot = getExecutionContext().snapshot();
    return function (this: unknown, ...args: unknown[]): unknown {
      return snapshot.run(() => Reflect.apply(listener, this, args));
    };
  });
}

/** Capture at effect registration, not when a later commit happens to flush its queue. */
export function bindEffect(effect: () => unknown): () => unknown {
  const snapshot = getExecutionContext().snapshot();
  return () => snapshot.run(() => {
    const cleanup = effect();
    if (typeof cleanup !== 'function') {
      return cleanup;
    }
    return function (this: unknown, ...args: unknown[]): unknown {
      return snapshot.run(() => Reflect.apply(cleanup, this, args));
    };
  });
}

export function attachRef<TResult>(fiber: unknown, callback: () => TResult): TResult {
  return runWithFiber(fiber, () => {
    if (isObject(fiber)) {
      refOwners.set(fiber, getExecutionContext().capture());
    }
    return callback();
  });
}

export function bindCallback<TThis, TArgs extends unknown[], TResult>(callback: (this: TThis, ...args: TArgs) => TResult) {
  return getExecutionContext().snapshot().bind(callback);
}

export function runWithInstance<TResult>(
  instance: unknown,
  callback: () => TResult,
  resolveCurrent?: (fiber: object) => unknown
): TResult {
  const fiber: unknown = isObject(instance) ? Reflect.get(instance, '_reactInternals') : null;
  return runWithFiber(isObject(fiber) && resolveCurrent != null ? resolveCurrent(fiber) : fiber, callback);
}

export function registerRenderer(profile: string): void {
  const globalContext = getMicroFrontendGlobalContext();
  const key = 'microFrontendExecutionRenderer';
  const existing: unknown = Reflect.get(globalContext, key);
  if (existing != null) {
    if (!isObject(existing) || Reflect.get(existing, 'profile') !== profile || Reflect.get(existing, 'version') !== 1) {
      throw new Error('Incompatible execution renderer integration');
    }
    return;
  }
  Object.defineProperty(globalContext, key, { value: Object.freeze({ version: 1, profile }) });
}

export function detachRef<TResult>(fiber: unknown, callback: () => TResult): TResult {
  const alternate: unknown = isObject(fiber) ? Reflect.get(fiber, 'alternate') : null;
  const owner = isObject(fiber) && refOwners.has(fiber) ? fiber : alternate;
  if (isObject(owner) && refOwners.has(owner)) {
    const token = refOwners.get(owner) ?? null;
    refOwners.delete(owner);
    if (isObject(fiber)) {
      refOwners.delete(fiber);
    }
    if (isObject(alternate)) {
      refOwners.delete(alternate);
    }
    return getExecutionContext().run(token, callback);
  }
  return runWithFiber(fiber, callback);
}
