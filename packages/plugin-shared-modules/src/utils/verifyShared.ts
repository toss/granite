import type { SharedModulesPluginOptions } from '../types';

export function verifyShared(shared: SharedModulesPluginOptions['shared']) {
  for (const config of Object.values(shared ?? {})) {
    if (config.singleton !== true) {
      throw new Error('Only singleton shared modules are currently supported');
    }
  }
}
