import { getMicroFrontendGlobalContext } from '../runtime/globalContext';

export interface ExecutionToken {
  /** Identifies one native ownership lifetime, including its runtime generation. */
  readonly id: string;
}

export interface ExecutionSnapshot {
  readonly token: ExecutionToken | null;
  run<TResult>(callback: () => TResult): TResult;
  bind<TThis, TArgs extends unknown[], TResult>(
    callback: (this: TThis, ...args: TArgs) => TResult
  ): (this: TThis, ...args: TArgs) => TResult;
}

export interface ExecutionContext {
  readonly version: 1;
  readonly runtimeToken: ExecutionToken | null;
  bindRuntime(token: ExecutionToken): void;
  runRuntime<TResult>(callback: () => TResult): TResult;
  capture(): ExecutionToken | null;
  run<TResult>(token: ExecutionToken | null, callback: () => TResult): TResult;
  snapshot(): ExecutionSnapshot;
}

const CONTEXT_KEY = 'microFrontendExecutionContext';
const NATIVE_RUNTIME_ID = '__GRANITE_EXECUTION_ROOT_ID__';

interface NativeExecutionContext {
  readonly version: 1;
  capture(): object;
  current(): string | null;
  bindRoot(id: string): void;
  runToken<T>(id: string | null | undefined, callback: () => T): T;
  runSnapshot<T>(handle: object, callback: () => T): T;
}
function nativeContext(): NativeExecutionContext | undefined {
  const value = Reflect.get(globalThis, '__RN_EXECUTION_CONTEXT_V1__') as NativeExecutionContext | undefined;
  if (value != null && (value.version !== 1 || ['capture', 'current', 'bindRoot', 'runToken', 'runSnapshot']
    .some(name => typeof Reflect.get(value, name) !== 'function'))) {
    throw new Error('Incompatible native execution context');
  }
  return value;
}

export function createExecutionContext(): ExecutionContext {
  let runtimeToken: ExecutionToken | null = null;
  // undefined is the runtime root, while null explicitly clears ownership.
  let current: ExecutionToken | null | undefined;

  function run<TResult>(token: ExecutionToken | null | undefined, callback: () => TResult): TResult {
    const previous = current;
    current = token;
    try {
      const native = nativeContext();
      return native == null ? callback() : native.runToken(token === undefined ? undefined : token?.id ?? null, callback);
    } finally {
      // A returned Promise does not extend this synchronous execution segment.
      current = previous;
    }
  }

  return Object.freeze({
    version: 1,
    get runtimeToken() { return runtimeToken; },
    bindRuntime(token: ExecutionToken): void {
      if (typeof token.id !== 'string' || token.id.length === 0) {
        throw new Error('Runtime execution requires a nonempty lifetime ID');
      }
      if (runtimeToken != null && runtimeToken.id !== token.id) {
        throw new Error('Runtime execution lifetime cannot be replaced');
      }
      if (runtimeToken == null && nativeContext() != null && current !== undefined) {
        throw new Error('Native execution context must be installed at the runtime root');
      }
      runtimeToken ??= Object.freeze({ id: token.id });
      nativeContext()?.bindRoot(token.id);
    },
    capture: () => {
      const native = nativeContext();
      if (native == null) return current === undefined ? runtimeToken : current;
      const id = native.current();
      if (id == null) return null;
      return current?.id === id ? current : runtimeToken?.id === id ? runtimeToken : Object.freeze({ id });
    },
    run,
    runRuntime: <TResult>(callback: () => TResult): TResult => run(undefined, callback),
    snapshot(): ExecutionSnapshot {
      const token = current;
      const native = nativeContext();
      const handle = native?.capture();
      const capturedId = native?.current();
      const snapshot: ExecutionSnapshot = {
        get token() { return capturedId === undefined ? (token === undefined ? runtimeToken : token) : capturedId === null ? null : { id: capturedId }; },
        run<TResult>(callback: () => TResult): TResult {
          if (native == null || handle == null) return run(token, callback);
          const previous = current;
          current = token;
          try { return native.runSnapshot(handle, callback); }
          finally { current = previous; }
        },
        bind<TThis, TArgs extends unknown[], TResult>(callback: (this: TThis, ...args: TArgs) => TResult) {
          return function (this: TThis, ...args: TArgs): TResult {
            return snapshot.run(() => callback.apply(this, args));
          };
        },
      };
      return Object.freeze(snapshot);
    },
  });
}

/** Host and independently evaluated service bundles must share the same execution cell. */
export function getExecutionContext(): ExecutionContext {
  const globalContext = getMicroFrontendGlobalContext();
  const installed: unknown = Reflect.get(globalContext, CONTEXT_KEY);
  if (installed != null) {
    if (
      typeof installed !== 'object' ||
      Reflect.get(installed, 'version') !== 1 ||
      typeof Reflect.get(installed, 'capture') !== 'function' ||
      typeof Reflect.get(installed, 'run') !== 'function' ||
      typeof Reflect.get(installed, 'snapshot') !== 'function' ||
      typeof Reflect.get(installed, 'bindRuntime') !== 'function' ||
      typeof Reflect.get(installed, 'runRuntime') !== 'function'
    ) {
      throw new Error('Incompatible micro-frontend execution context');
    }
    const context = installed as ExecutionContext;
    bindNativeRuntime(context);
    return context;
  }

  const context = createExecutionContext();
  bindNativeRuntime(context);
  Object.defineProperty(globalContext, CONTEXT_KEY, { value: context });
  return context;
}

function bindNativeRuntime(context: ExecutionContext): void {
  const id: unknown = Reflect.get(globalThis, NATIVE_RUNTIME_ID);
  if (id === undefined) return;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Invalid native runtime execution identity');
  }
  if (context.runtimeToken?.id !== id) context.bindRuntime({ id });
}
