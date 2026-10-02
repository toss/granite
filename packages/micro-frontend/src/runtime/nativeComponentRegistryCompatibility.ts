import { getMicroFrontendGlobalContext } from './globalContext';

const NATIVE_COMPONENT_REGISTRY_MODULE = 'react-native/Libraries/NativeComponent/NativeComponentRegistry';
const COMPATIBILITY_MARKER = Symbol.for('granite.microFrontend.nativeComponentRegistryCompatibility');

export function installNativeComponentRegistryCompatibility(): void {
  const sharedModules = getMicroFrontendGlobalContext().__SHARED__;
  const sharedEntry = sharedModules[NATIVE_COMPONENT_REGISTRY_MODULE];
  if (sharedEntry == null || Reflect.get(sharedEntry, COMPATIBILITY_MARKER) === true) {
    return;
  }

  const nativeComponentRegistry = sharedEntry.get();
  if (!isNativeComponentRegistry(nativeComponentRegistry)) {
    return;
  }

  const compatibleRegistry = new Proxy(nativeComponentRegistry, {
    get(target, property, receiver) {
      if (property !== 'get') {
        return Reflect.get(target, property, receiver);
      }

      return (...args: readonly unknown[]) => {
        try {
          return Reflect.apply(target.get, target, args);
        } catch (error) {
          const componentName = args[0];
          if (typeof componentName === 'string' && isDuplicateNativeViewRegistration(error, componentName)) {
            return componentName;
          }
          throw error;
        }
      };
    },
  });
  const compatibleEntry = {
    get: () => compatibleRegistry,
    loaded: sharedEntry.loaded,
  };
  Reflect.defineProperty(compatibleEntry, COMPATIBILITY_MARKER, { value: true });
  sharedModules[NATIVE_COMPONENT_REGISTRY_MODULE] = compatibleEntry;
}

function isNativeComponentRegistry(
  value: unknown
): value is { readonly get: (...args: readonly unknown[]) => unknown } {
  return typeof value === 'object' && value != null && typeof Reflect.get(value, 'get') === 'function';
}

function isDuplicateNativeViewRegistration(error: unknown, componentName: string): boolean {
  if (typeof error !== 'object' || error == null) {
    return false;
  }

  const message = Reflect.get(error, 'message');
  return (
    typeof message === 'string' && message.endsWith(`Tried to register two views with the same name ${componentName}`)
  );
}
