// Keep this helper self-contained so runtime and generated registrations stay identical.
export function registerSharedValue(
  sharedModules: Record<string, { readonly get: () => unknown; readonly loaded: boolean }>,
  moduleName: string,
  module: unknown,
  normalize: (value: unknown) => unknown
): boolean {
  // Preserve original identity across independently bundled runtimes.
  const sourceKey = Symbol.for('granite.microFrontend.sharedModuleSource');
  const existingModule = sharedModules[moduleName];
  if (existingModule != null) {
    return (
      typeof existingModule === 'object' &&
      typeof existingModule.get === 'function' &&
      typeof existingModule.loaded === 'boolean' &&
      (Object.is(existingModule.get(), module) ||
        (Object.prototype.hasOwnProperty.call(existingModule, sourceKey) &&
          Object.is(Reflect.get(existingModule, sourceKey), module)))
    );
  }
  const value = normalize(module);
  const entry = { get: () => value, loaded: true };
  Object.defineProperty(entry, sourceKey, { value: module });
  sharedModules[moduleName] = entry;
  return true;
}

// Registers the entry now and loads the module on the first `get()`, so a host can share a
// package without evaluating it at startup. Keep this helper self-contained like the one above.
export function registerLazySharedValue(
  sharedModules: Record<string, { readonly get: () => unknown; readonly loaded: boolean }>,
  moduleName: string,
  load: () => unknown,
  normalize: (value: unknown) => unknown
): boolean {
  const sourceKey = Symbol.for('granite.microFrontend.sharedModuleSource');
  const existingModule = sharedModules[moduleName];
  if (existingModule != null) {
    // Another runtime registered first. Identity can only be compared by loading the module.
    const module = load();
    return (
      typeof existingModule === 'object' &&
      typeof existingModule.get === 'function' &&
      typeof existingModule.loaded === 'boolean' &&
      (Object.is(existingModule.get(), module) ||
        (Object.prototype.hasOwnProperty.call(existingModule, sourceKey) &&
          Object.is(Reflect.get(existingModule, sourceKey), module)))
    );
  }
  let loaded = false;
  let value: unknown;
  const entry = {
    get: () => {
      if (!loaded) {
        // A throwing load leaves the entry unloaded, so the next get() retries and throws again.
        const module = load();
        value = normalize(module);
        Object.defineProperty(entry, sourceKey, { value: module });
        loaded = true;
      }
      return value;
    },
    get loaded() {
      return loaded;
    },
  };
  sharedModules[moduleName] = entry;
  return true;
}
