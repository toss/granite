import type { ExecutionContext, ExecutionSnapshot } from './context';

const INSTALLATION = Symbol.for('granite.microFrontend.asyncExecution.v1');
const SCHEDULERS = [
  'setTimeout',
  'setInterval',
  'setImmediate',
  'queueMicrotask',
  'requestAnimationFrame',
  'requestIdleCallback',
] as const;

interface Installation {
  readonly context: ExecutionContext;
  readonly dispose: () => void;
}

type Callback = (this: unknown, ...args: unknown[]) => unknown;

function bindCallback(snapshot: ExecutionSnapshot, callback: unknown): unknown {
  if (typeof callback !== 'function') {return callback;}
  return function (this: unknown, ...args: unknown[]): unknown {
    return snapshot.run(() => Reflect.apply(callback, this, args));
  };
}

/** Install once at runtime startup, before service code captures scheduler functions. */
export function installAsyncBoundaries(context: ExecutionContext, target: object = globalThis): () => void {
  const installed: Installation | undefined = Reflect.get(target, INSTALLATION);
  if (installed != null) {
    if (installed.context !== context) {throw new Error('Async execution is already owned by another context');}
    return installed.dispose;
  }

  const restores: Array<() => void> = [];
  function replace(owner: object, name: string, wrap: (original: Callback) => Callback): void {
    const original: unknown = Reflect.get(owner, name);
    if (typeof original !== 'function') {return;}
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    const replacement = wrap(original as Callback);
    Object.defineProperty(owner, name, {
      configurable: descriptor?.configurable ?? true,
      enumerable: descriptor?.enumerable ?? true,
      writable: descriptor != null && 'writable' in descriptor ? descriptor.writable : true,
      value: replacement,
    });
    restores.push(() => {
      if (Reflect.get(owner, name) !== replacement) {return;}
      if (descriptor == null) {Reflect.deleteProperty(owner, name);}
      else {Object.defineProperty(owner, name, descriptor);}
    });
  }

  function restore(): void {
    for (const undo of restores.splice(0).reverse()) {undo();}
  }

  try {
    const promise: unknown = Reflect.get(target, 'Promise');
    if (typeof promise !== 'function') {throw new Error('Async execution requires a Promise implementation');}
    const prototype: object = Reflect.get(promise, 'prototype');
    replace(
      prototype,
      'then',
      (original) =>
        function (this: unknown, fulfilled: unknown, rejected: unknown) {
          const snapshot = context.snapshot();
          return Reflect.apply(original, this, [bindCallback(snapshot, fulfilled), bindCallback(snapshot, rejected)]);
        }
    );

    for (const name of SCHEDULERS) {
      replace(
        target,
        name,
        (original) =>
          function (this: unknown, callback: unknown, ...args: unknown[]) {
            return Reflect.apply(original, this, [bindCallback(context.snapshot(), callback), ...args]);
          }
      );
    }

    const installation: Installation = {
      context,
      dispose() {
        if (Reflect.get(target, INSTALLATION) !== installation) {return;}
        restore();
        Reflect.deleteProperty(target, INSTALLATION);
      },
    };
    Object.defineProperty(target, INSTALLATION, { value: installation, configurable: true });
    return installation.dispose;
  } catch (error) {
    restore();
    throw error;
  }
}
