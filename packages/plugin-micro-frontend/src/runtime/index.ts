/* eslint-disable @typescript-eslint/naming-convention */

import type { RemoteConfig, SharedConfig } from '../types';

declare global {
  // eslint-disable-next-line no-var
  var __SHARED_MODULES__: RuntimeContext;
}

interface RuntimeContext {
  __INSTANCES__: Instance[] & Record<string, boolean>;
  __SHARED__: SharedModuleRegistry;
}

interface Instance {
  name: string;
  config: {
    remote?: RemoteConfig;
    shared?: SharedConfig;
  };
}

interface SharedModuleRegistry {
  [libName: string]: {
    get: () => any;
    loaded: boolean;
  };
}

export { createContainer } from './createContainer';
export { registerShared } from './registerShared';
