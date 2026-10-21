import { AppRegistry } from 'react-native';
import { markComponentProviderRecorderInstalled, recordComponentProvider } from './componentProviderStore';

type AppRegistryLike = Pick<typeof AppRegistry, 'registerComponent'>;

interface ReactNativeExports {
  readonly AppRegistry: AppRegistryLike;
}

// Metro and esbuild provide `require` to bundled modules; it returns the CommonJS exports of `react-native`.
declare const require: (moduleName: 'react-native') => ReactNativeExports;

const RECORDING_APP_REGISTRY = Symbol.for('granite.rnComponentView.recordingAppRegistry');

/**
 * Records every component registered with `AppRegistry.registerComponent`, so `RNComponentViewRenderer` can render it
 * into a Portal. React Native keeps the provider inside the runnable it registers and cannot hand it back.
 *
 * Call it before the components you want to show register: it cannot recover earlier registrations. Components in the
 * host bundle register when their module evaluates, and a component session's bundle registers while it evaluates.
 * Registration still reaches React Native.
 *
 * Imports are hoisted, so a call in the host entry runs after every module that the entry imports. Call it in a module
 * of its own and import that module first in the host entry. "Installing the provider recorder" in the package README
 * covers Metro's `inlineRequires`, `sideEffects`, and the registrations the recorder does not see.
 *
 * Bundlers expose `AppRegistry` to imports as a read-only namespace, so the recorder replaces the `AppRegistry`
 * accessor of the `react-native` CommonJS exports, which named imports and the micro-frontend shared scope read
 * through. Returns false and warns when imports still see the original AppRegistry.
 */
export function installComponentProviderRecorder(): boolean {
  return installComponentProviderRecorderOn(require('react-native'), () => AppRegistry);
}

/** @internal */
export function installComponentProviderRecorderOn(
  reactNativeExports: ReactNativeExports,
  readImportedAppRegistry: () => AppRegistryLike
): boolean {
  const originalAppRegistry = reactNativeExports.AppRegistry;
  if (Reflect.get(originalAppRegistry, RECORDING_APP_REGISTRY) === true) {
    return true;
  }

  const registerComponent: AppRegistryLike['registerComponent'] = (appKey, componentProvider, section) => {
    recordComponentProvider(appKey, componentProvider);
    return originalAppRegistry.registerComponent(appKey, componentProvider, section);
  };
  const recordingAppRegistry: AppRegistryLike = { ...originalAppRegistry, registerComponent };
  Reflect.defineProperty(recordingAppRegistry, RECORDING_APP_REGISTRY, { value: true });
  // Reflect.defineProperty returns false instead of throwing when the accessor cannot be replaced.
  Reflect.defineProperty(reactNativeExports, 'AppRegistry', {
    configurable: true,
    enumerable: true,
    get: () => recordingAppRegistry,
  });

  // Check through the import, the path the components use.
  const isInstalled = readImportedAppRegistry().registerComponent === registerComponent;
  if (isInstalled) {
    markComponentProviderRecorderInstalled();
  } else {
    console.warn('Could not record AppRegistry.registerComponent, so RNComponentViewRenderer cannot find components');
  }
  return isInstalled;
}
