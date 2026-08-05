import { createMicroFrontendRuntime } from '@granite-js/micro-frontend';
import { nativeBundleLoaderAdapter } from './nativeBundleLoader';

export const microFrontendRuntime = createMicroFrontendRuntime({
  adapter: nativeBundleLoaderAdapter,
});
