import type { Module } from './types';

const DUPLICATE_VIEW_MESSAGE = 'Tried to register two views with the same name';

/**
 * Native view configs live in a host-wide registry with no unregister API,
 * while scoped services re-run their module graphs on every (re)mount. The
 * second registration of the same component name would kill the render with
 * an invariant, so the shared registry entry recovers by reusing the config
 * that the first registration installed.
 */
export function toDuplicateTolerantNativeComponentRegistry(registry: Module): Module {
  const wrapRegistration = (fn: unknown) => {
    if (typeof fn !== 'function') {
      return fn;
    }

    return (name: string, ...args: unknown[]) => {
      try {
        return fn(name, ...args);
      } catch (error) {
        if (error instanceof Error && error.message.includes(DUPLICATE_VIEW_MESSAGE)) {
          // `get` returns the component name as the Fabric host component.
          return name;
        }

        throw error;
      }
    };
  };

  return {
    ...registry,
    get: wrapRegistration(registry.get),
    getWithFallback_DEPRECATED: wrapRegistration(registry.getWithFallback_DEPRECATED),
  };
}
