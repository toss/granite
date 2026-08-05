import type { MicroFrontendAdapter } from '@granite-js/micro-frontend';
import { type TurboModule, TurboModuleRegistry } from 'react-native';

interface NativeBundleLoaderSpec extends TurboModule {
  readonly loadBundle: (appName: string) => Promise<string>;
}

const NativeBundleLoader = TurboModuleRegistry.getEnforcing<NativeBundleLoaderSpec>('GraniteMicroFrontendBundleLoader');

export const nativeBundleLoaderAdapter: MicroFrontendAdapter = {
  loadBundle(appName) {
    return NativeBundleLoader.loadBundle(appName);
  },
};
