import type { RuntimeContext } from './types';

const activeRuntimeContexts: RuntimeContext[] = [];
const runtimeContextErrors = new WeakMap<RuntimeContext, Error>();

export function createRuntimeContext(): RuntimeContext {
  return {
    __INSTANCES__: Object.assign<[], Record<string, number>>([], {}),
    __SHARED__: {},
  };
}

export function getDefaultRuntimeContext() {
  if (global.__MICRO_FRONTEND__ == null) {
    global.__MICRO_FRONTEND__ = createRuntimeContext();
  }

  return global.__MICRO_FRONTEND__;
}

export function getRuntimeContext(context?: RuntimeContext) {
  return context ?? activeRuntimeContexts[activeRuntimeContexts.length - 1] ?? getDefaultRuntimeContext();
}

export function rejectRuntimeContext(context: RuntimeContext, message: string) {
  runtimeContextErrors.set(context, new Error(message));
}

export function assertRuntimeContextUsable(context: RuntimeContext) {
  const error = runtimeContextErrors.get(context);
  if (error != null) {
    throw error;
  }
}

export function removeActiveRuntimeContext(context: RuntimeContext) {
  const contextIndex = activeRuntimeContexts.lastIndexOf(context);
  if (contextIndex >= 0) {
    activeRuntimeContexts.splice(contextIndex, 1);
  }
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  if (value == null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false;
  }

  return typeof Reflect.get(value, 'then') === 'function';
}

export function runWithRuntimeContext<Result>(context: RuntimeContext, callback: () => Result): Result {
  activeRuntimeContexts.push(context);

  try {
    const result = callback();

    if (isPromiseLike(result)) {
      void Promise.resolve(result)
        .finally(() => {
          removeActiveRuntimeContext(context);
        })
        .catch(() => undefined);

      return result;
    }

    removeActiveRuntimeContext(context);
    return result;
  } catch (error) {
    removeActiveRuntimeContext(context);
    throw error;
  }
}
