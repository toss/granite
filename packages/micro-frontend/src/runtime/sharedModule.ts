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
