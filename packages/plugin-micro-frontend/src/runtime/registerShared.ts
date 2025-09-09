import type { Module } from './types';
import { toESM } from './utils';

export function registerShared(libName: string, module: Module) {
  if (global.__MICRO_FRONTEND__.__SHARED__[libName]) {
    throw new Error(`'${libName}' already registered as a shared module`);
  }

  global.__MICRO_FRONTEND__.__SHARED__[libName] = {
    get: () => toESM(module),
    // Always mark as loaded because we don't support lazy loading yet.
    loaded: true,
  };
}
