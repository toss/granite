import v8 from 'node:v8';
import vm from 'node:vm';

// WeakRef canary specs need a forced full collection. Exposing gc here keeps
// the test script free of NODE_OPTIONS juggling (which clobbers Yarn PnP's
// injected loader options).
if (typeof globalThis.gc !== 'function') {
  v8.setFlagsFromString('--expose-gc');
  const exposedGc = vm.runInNewContext('gc');
  v8.setFlagsFromString('--no-expose-gc');

  (globalThis as { gc?: () => void }).gc = exposedGc;
}
