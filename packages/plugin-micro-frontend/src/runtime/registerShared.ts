import { assertRuntimeContextUsable, getRuntimeContext } from './context';
import type { Module, RuntimeContext } from './types';
import { toESM } from './utils';

export function registerShared(libName: string, module: Module, context?: RuntimeContext) {
  const runtimeContext = getRuntimeContext(context);
  assertRuntimeContextUsable(runtimeContext);

  if (runtimeContext.__SHARED__[libName]) {
    throw new Error(`'${libName}' already registered as a shared module`);
  }

  runtimeContext.__SHARED__[libName] = {
    get: () => toESM(module),
    // Always mark as loaded because we don't support lazy loading yet.
    loaded: true,
  };
}
