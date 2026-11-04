import { getExecutionContext } from './context';

type Callback = (this: unknown, ...args: unknown[]) => unknown;
const wrappers = new WeakMap<Callback, Callback>();
const schedulers = ['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame', 'requestIdleCallback'];

function wrapped(original: Callback, callbackCount: number): Callback {
  let result = wrappers.get(original);
  if (result != null) return result;
  result = function (this: unknown, ...args: unknown[]) {
    const snapshot = getExecutionContext().snapshot();
    for (let index = 0; index < Math.min(args.length, callbackCount); index++) {
      if (typeof args[index] === 'function') args[index] = snapshot.bind(args[index] as Callback);
    }
    return Reflect.apply(original, this, args);
  };
  wrappers.set(original, result);
  return result;
}

/** Compiler-inserted function reads, not mutations of the global scheduler. */
export function executionScheduler<T>(value: T): T {
  if (typeof value !== 'function' || !schedulers.some(name => Reflect.get(globalThis, name) === value)) return value;
  return wrapped(value as Callback, 1) as T;
}

/** Read the property once; user-defined methods keep their original identity and semantics. */
export function executionMethod(receiver: object, key: PropertyKey): unknown {
  const original: unknown = (receiver as Record<PropertyKey, unknown>)[key];
  const prototype = globalThis.Promise?.prototype;
  if (typeof original !== 'function' || prototype == null ||
    !['then', 'catch', 'finally'].some(name => key === name && Reflect.get(prototype, name) === original)) return original;
  return wrapped(original as Callback, key === 'then' ? 2 : 1);
}

/** Preserve the receiver for a method call while evaluating it only once. */
export function executionInvoke(receiver: object, key: PropertyKey): (...args: unknown[]) => unknown {
  const method = executionMethod(receiver, key) as Callback;
  return (...args: unknown[]) => Reflect.apply(method, receiver, args);
}

export function executionSchedule(receiver: object, key: PropertyKey): (...args: unknown[]) => unknown {
  const method = executionScheduler((receiver as Record<PropertyKey, unknown>)[key]) as Callback;
  return (...args: unknown[]) => Reflect.apply(method, receiver, args);
}

export function executionGlobals(receiver: object): object {
  return new Proxy(receiver, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      return typeof key === 'string' && schedulers.includes(key) ? executionScheduler(value) : value;
    },
  });
}
