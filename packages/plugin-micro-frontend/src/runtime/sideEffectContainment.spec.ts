import { afterEach, describe, expect, it, vi } from 'vitest';
import { scopeBundleSource } from '../scopeBundle';
import { createServiceManager } from './serviceManager';
import type { RuntimeContext } from './types';

const REMOTE_PATH = 'remoteApp/AppContainer';

type TestGlobal = typeof globalThis & {
  __GRANITE_MICRO_FRONTEND_ENTRIES__?: Record<string, unknown>;
  __GRANITE_MICRO_FRONTEND_SCOPES__?: Record<string, RuntimeContext>;
  __MICRO_FRONTEND__?: unknown;
  __TEST_LEAK_BUCKET__?: unknown[];
  ErrorUtils?: unknown;
  implicitEscapeForSpecPurposes?: unknown;
};

const testGlobal = globalThis as TestGlobal;
const originalFetch = testGlobal.fetch;

afterEach(() => {
  delete testGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__;
  delete testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__;
  delete (testGlobal as Record<string, unknown>).__MICRO_FRONTEND__;
  delete testGlobal.__TEST_LEAK_BUCKET__;
  delete testGlobal.ErrorUtils;
  delete testGlobal.implicitEscapeForSpecPurposes;
  testGlobal.fetch = originalFetch;
  vi.restoreAllMocks();
});

function containerStatements() {
  return `var context = global.__MICRO_FRONTEND__;
  var container = {
    name: 'remoteApp',
    exposeMap: { AppContainer: { __esModule: true, default: function AppContainer() { return null; } } },
    config: {}
  };
  Object.defineProperty(context.__INSTANCES__, 'remoteApp', {
    value: context.__INSTANCES__.length,
    enumerable: false
  });
  context.__INSTANCES__.push(container);`;
}

async function loadAndDispose(moduleStatements: string) {
  const source = `var global = hostGlobal;
(function() {
  ${moduleStatements}
  ${containerStatements()}
})();
`;
  const scopedSource = scopeBundleSource(source, { appName: 'svc', name: 'remoteApp' });
  const manager = createServiceManager({ releaseGraceMs: 0 });
  const handle = manager.loadService('svc', {
    remotePath: REMOTE_PATH,
    evaluate: async () => {
      new Function('hostGlobal', scopedSource)(testGlobal);
    },
  });
  handle.retain();
  await handle.promise;

  return {
    dispose: () => manager.unloadService('svc', { force: true }),
  };
}

describe('side-effect containment', () => {
  it('gates queueMicrotask callbacks after dispose', async () => {
    testGlobal.__TEST_LEAK_BUCKET__ = [];
    const { dispose } = await loadAndDispose(`global.__TEST_LEAK_BUCKET__.push(queueMicrotask);`);
    const scopedQueueMicrotask = testGlobal.__TEST_LEAK_BUCKET__?.[0] as (cb: () => void) => void;

    const beforeDispose = vi.fn();
    scopedQueueMicrotask(beforeDispose);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(beforeDispose).toHaveBeenCalledOnce();

    const afterDispose = vi.fn();
    scopedQueueMicrotask(afterDispose);
    dispose();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(afterDispose).not.toHaveBeenCalled();
  });

  it('aborts in-flight fetches on dispose and links caller signals', async () => {
    const seenSignals: AbortSignal[] = [];
    testGlobal.fetch = ((_input: unknown, init?: { signal?: AbortSignal }) => {
      seenSignals.push(init!.signal!);
      return new Promise(() => {});
    }) as typeof fetch;

    const { dispose } = await loadAndDispose(`fetch('https://example.com/service-data');`);

    expect(seenSignals).toHaveLength(1);
    expect(seenSignals[0]!.aborted).toBe(false);
    dispose();
    expect(seenSignals[0]!.aborted).toBe(true);
  });

  it('removes module-scope emitter subscriptions made through the shared react-native facade', async () => {
    const removeSpy = vi.fn();
    const fakeReactNative = {
      DeviceEventEmitter: {
        addListener: () => ({ remove: removeSpy }),
      },
    };
    (testGlobal as Record<string, unknown>).__MICRO_FRONTEND__ = {
      __INSTANCES__: Object.assign([], {}),
      __SHARED__: {
        'react-native': { get: () => fakeReactNative, loaded: true },
      },
    };

    const { dispose } = await loadAndDispose(
      `var reactNative = global.__MICRO_FRONTEND__.__SHARED__['react-native'].get();
  reactNative.DeviceEventEmitter.addListener('serviceEvent', function () {});`
    );

    expect(removeSpy).not.toHaveBeenCalled();
    dispose();
    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('restores the previous global error handler on dispose', async () => {
    const initialHandler = () => {};
    const errorUtilsState = {
      handler: initialHandler as unknown,
      getGlobalHandler() {
        return this.handler;
      },
      setGlobalHandler(next: unknown) {
        this.handler = next;
      },
    };
    testGlobal.ErrorUtils = errorUtilsState;

    const { dispose } = await loadAndDispose(`ErrorUtils.setGlobalHandler(function serviceHandler() {});`);

    expect(errorUtilsState.handler).not.toBe(initialHandler);
    dispose();
    expect(errorUtilsState.handler).toBe(initialHandler);
  });

  it('rejects a bare assignment before it can escape (strict-mode factory)', async () => {
    // Strict mode turns the classic sloppy leak into a ReferenceError at the
    // assignment site, so the escape never reaches the host global.
    await expect(loadAndDispose(`implicitEscapeForSpecPurposes = 'leaked';`)).rejects.toThrow(ReferenceError);
    expect(testGlobal.implicitEscapeForSpecPurposes).toBeUndefined();
  });

  it('warns about globals that escaped the scope via a Function-constructor realm reference', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Function('return this')() returns the real host global even under a
    // strict factory (the constructed function body is sloppy), so this
    // escape survives strict mode and must still be caught by the sweep.
    const { dispose } = await loadAndDispose(
      `Function('return this')().implicitEscapeForSpecPurposes = 'leaked';`
    );

    expect(testGlobal.implicitEscapeForSpecPurposes).toBe('leaked');
    dispose();
    const warned = warnSpy.mock.calls.some(
      (call) => typeof call[0] === 'string' && call[0].includes('implicitEscapeForSpecPurposes')
    );
    expect(warned).toBe(true);
  });
});
