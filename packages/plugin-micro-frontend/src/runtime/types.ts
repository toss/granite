/* eslint-disable @typescript-eslint/naming-convention */
import type { RemoteConfig, SharedConfig } from '../types';

declare global {
  var __MICRO_FRONTEND__: RuntimeContext;
}

export interface RuntimeContext {
  __INSTANCES__: Container[] & Record<string, number>;
  __SHARED__: SharedModuleRegistry;
}

export interface Container {
  name: string;
  exposeMap: Record<string, Module>;
  scope?: import('./remoteScope').RemoteScope | null;
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
