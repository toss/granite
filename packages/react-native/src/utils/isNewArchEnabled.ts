export function isNewArchEnabled() {
  const globalObject = globalThis as typeof globalThis & {
    RN$Bridgeless?: boolean;
    nativeFabricUIManager?: unknown;
    __turboModuleProxy?: unknown;
  };

  return (
    globalObject.RN$Bridgeless === true ||
    globalObject.nativeFabricUIManager != null ||
    globalObject.__turboModuleProxy != null
  );
}
