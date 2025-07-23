/* eslint-disable @typescript-eslint/naming-convention */
import type { RemoteConfig, SharedConfig } from '../types';

declare global {
  // eslint-disable-next-line no-var
  var __MICRO_FRONTEND__: RuntimeContext;
}

export interface RuntimeContext {
  __INSTANCES__: Container[] & Record<string, number>;
  __SHARED__: SharedModuleRegistry;
}

export interface Container {
  name: string;
  exposeMap: Record<string, Module>;
  config: {
    remote?: RemoteConfig;
    shared?: SharedConfig;
  };
}

export interface SharedModuleRegistry {
  [libName: string]: {
    get: () => Module;
    loaded: boolean;
  };
}

export type Module = any;
