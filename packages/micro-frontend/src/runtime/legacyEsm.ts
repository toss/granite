// Keep this helper self-contained: the build plugin serializes it into the prelude.
export function toLegacyEsm(module: unknown): unknown {
  if ((typeof module !== 'object' || module == null) && typeof module !== 'function') {
    return module;
  }
  if (Reflect.get(module, '__esModule') === true) {
    return module;
  }
  const legacyModule =
    typeof module === 'function'
      ? function (this: unknown, ...args: unknown[]): unknown {
          return Reflect.apply(module, this, args);
        }
      : {};
  for (const exportName of Reflect.ownKeys(module)) {
    if (exportName === '__esModule' || exportName === 'default') {
      continue;
    }
    const sourceDescriptor = Reflect.getOwnPropertyDescriptor(module, exportName);
    const facadeDescriptor = Reflect.getOwnPropertyDescriptor(legacyModule, exportName);
    if (sourceDescriptor == null || facadeDescriptor?.configurable === false) {
      // Callable facades keep intrinsic non-configurable slots such as prototype.
      continue;
    }
    Reflect.defineProperty(legacyModule, exportName, {
      enumerable: sourceDescriptor.enumerable,
      get: () => Reflect.get(module, exportName),
    });
  }
  const hasDefaultExport = Reflect.getOwnPropertyDescriptor(module, 'default') != null;
  Object.defineProperties(legacyModule, {
    __esModule: { value: true },
    default: {
      enumerable: true,
      get: hasDefaultExport ? () => Reflect.get(module, 'default') : () => module,
    },
  });
  return legacyModule;
}
