export function registerShared(libName: string, module: any) {
  if (global.__SHARED_MODULES__.__SHARED__[libName]) {
    throw new Error(`'${libName}' already registered as a shared module`);
  }

  global.__SHARED_MODULES__.__SHARED__[libName] = {
    // Add `__esModule` flag to ensure compatibility between ESM and CJS.
    get: () => Object.assign(module, { __esModule: true }),
    // Always mark as loaded because we don't support lazy loading yet.
    loaded: true,
  };
}
