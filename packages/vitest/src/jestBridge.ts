import { createRequire } from 'node:module';
import { vi } from 'vitest';
import { installRequestAnimationFrameShim } from './runtimeBootstrap';

type JestShim = {
  advanceTimersByTime: typeof vi.advanceTimersByTime;
  clearAllMocks: typeof vi.clearAllMocks;
  doMock: typeof vi.doMock;
  fn: typeof vi.fn;
  getRealSystemTime: typeof vi.getRealSystemTime;
  mock: typeof vi.mock;
  now: () => number;
  requireActual: (moduleName: string) => unknown;
  resetAllMocks: typeof vi.resetAllMocks;
  restoreAllMocks: typeof vi.restoreAllMocks;
  spyOn: typeof vi.spyOn;
  unmock: typeof vi.unmock;
  useFakeTimers: typeof vi.useFakeTimers;
  useRealTimers: typeof vi.useRealTimers;
};

type RuntimeGlobals = typeof globalThis & {
  jest?: JestShim;
};

export function installVitestJestBridge() {
  const runtimeGlobals = globalThis as RuntimeGlobals;
  const runtimeRequire = createRequire(import.meta.url);

  installRequestAnimationFrameShim(runtimeGlobals);

  runtimeGlobals.jest = {
    advanceTimersByTime: vi.advanceTimersByTime,
    clearAllMocks: vi.clearAllMocks,
    doMock: vi.doMock,
    fn: vi.fn,
    getRealSystemTime: vi.getRealSystemTime,
    mock: vi.mock,
    now: () => vi.getMockedSystemTime()?.valueOf() ?? Date.now(),
    requireActual: (moduleName: string) => runtimeRequire(moduleName),
    resetAllMocks: vi.resetAllMocks,
    restoreAllMocks: vi.restoreAllMocks,
    spyOn: vi.spyOn,
    unmock: vi.unmock,
    useFakeTimers: (...args) => {
      const result = vi.useFakeTimers(...args);
      installRequestAnimationFrameShim(runtimeGlobals);
      return result;
    },
    useRealTimers: () => {
      const result = vi.useRealTimers();
      installRequestAnimationFrameShim(runtimeGlobals);
      return result;
    },
  };
}
