import { microFrontend } from '@granite-js/micro-frontend/plugin';
import type { GranitePluginCore } from '@granite-js/plugin-core';
import type { MicroFrontendPluginOptions } from './types';

/** @deprecated Use `microFrontend` from `@granite-js/micro-frontend/plugin`. */
export function microFrontendPlugin(options: MicroFrontendPluginOptions): Promise<GranitePluginCore> {
  return microFrontend({
    exposes: options.exposes,
    shared: options.shared,
  });
}
