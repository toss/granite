import type { PluginContext } from './types';

export function createContext(): PluginContext {
  return {
    meta: Object.create(null),
  };
}
