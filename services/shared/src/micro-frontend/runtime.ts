import { createMicroFrontendRuntime } from '@granite-js/micro-frontend';
import { TurboModuleRegistry, type TurboModule } from 'react-native';

type ExampleAppName = 'bare' | 'showcase';

interface NativeExampleBundleLoader extends TurboModule {
  readonly loadBundle: (request: { readonly appName: ExampleAppName }) => Promise<string>;
}

export function loadBundle(appName: string): Promise<string> {
  if (appName !== 'bare' && appName !== 'showcase') {
    return Promise.reject(new Error(`Unknown example app: ${appName}`));
  }

  const nativeBundleLoader = TurboModuleRegistry.getEnforcing<NativeExampleBundleLoader>(
    'GraniteExampleMicroFrontendBundleLoader'
  );
  return nativeBundleLoader.loadBundle({ appName });
}

export const microFrontendRuntime = createMicroFrontendRuntime({
  adapter: { loadBundle },
});
