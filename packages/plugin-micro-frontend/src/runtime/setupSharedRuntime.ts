import { registerShared } from './registerShared';
import type { Module, RuntimeContext } from './types';

export type SharedRuntimeModules = Readonly<Record<string, Module>>;

export function setupSharedRuntime(modules: SharedRuntimeModules): RuntimeContext {
  if (globalThis.__MICRO_FRONTEND__ == null) {
    globalThis.__MICRO_FRONTEND__ = {
      __INSTANCES__: [] as unknown as RuntimeContext['__INSTANCES__'],
      __SHARED__: {},
    };
  }

  for (const [name, module] of Object.entries(modules)) {
    if (globalThis.__MICRO_FRONTEND__.__SHARED__[name] == null) {
      registerShared(name, module);
    }
  }

  return globalThis.__MICRO_FRONTEND__;
}
