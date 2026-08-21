import { beforeEach, describe, expect, it } from 'vitest';
import { getMicroFrontendGlobalContext } from './globalContext';
import { installNativeComponentRegistryCompatibility } from './nativeComponentRegistryCompatibility';

const NATIVE_COMPONENT_REGISTRY_MODULE = 'react-native/Libraries/NativeComponent/NativeComponentRegistry';

describe('installNativeComponentRegistryCompatibility', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  });

  it('preserves native component registry errors other than duplicate registration', () => {
    // Given
    const registryError = new Error('Native component view config is unavailable');
    const nativeComponentRegistry = {
      get() {
        throw registryError;
      },
    };
    getMicroFrontendGlobalContext().__SHARED__[NATIVE_COMPONENT_REGISTRY_MODULE] = {
      get: () => nativeComponentRegistry,
      loaded: true,
    };
    installNativeComponentRegistryCompatibility();
    const remoteRegistry = getMicroFrontendGlobalContext().__SHARED__[NATIVE_COMPONENT_REGISTRY_MODULE]?.get();
    const remoteGet =
      typeof remoteRegistry === 'object' && remoteRegistry != null ? Reflect.get(remoteRegistry, 'get') : undefined;
    if (typeof remoteGet !== 'function') {
      throw new Error('NativeComponentRegistry.get is unavailable');
    }

    // When
    const getMissingNativeView = () => Reflect.apply(remoteGet, remoteRegistry, ['MissingNativeView', () => ({})]);

    // Then
    expect(getMissingNativeView).toThrow(registryError);
  });
});
