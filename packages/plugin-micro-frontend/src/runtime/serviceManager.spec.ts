import { afterEach, describe, expect, it } from 'vitest';
import { scopeBundleSource } from '../scopeBundle';
import { areCanariesCollected, createServiceManager, ServiceDisposedError } from './serviceManager';
import type { ServiceCanaries, ServiceDisposeResult } from './serviceManager';
import type { RuntimeContext } from './types';

const REMOTE_PATH = 'remoteApp/AppContainer';

type TestGlobal = typeof globalThis & {
  __GRANITE_MICRO_FRONTEND_ENTRIES__?: Record<string, unknown>;
  __GRANITE_MICRO_FRONTEND_SCOPES__?: Record<string, RuntimeContext>;
  __TEST_HOOK_LOG__?: string[];
  __TEST_LEAK_BUCKET__?: unknown[];
  __TEST_TICKS__?: number[];
  gc?: () => void;
};

const testGlobal = globalThis as TestGlobal;

afterEach(() => {
  delete testGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__;
  delete testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__;
  delete testGlobal.__TEST_HOOK_LOG__;
  delete testGlobal.__TEST_LEAK_BUCKET__;
  delete testGlobal.__TEST_TICKS__;
});

function createServiceSource(options: { leakComponentToHost?: boolean; leakClosureToHost?: boolean } = {}) {
  const leakStatements = [
    options.leakComponentToHost === true ? 'global.__TEST_LEAK_BUCKET__.push(AppContainer);' : '',
    options.leakClosureToHost === true
      ? 'global.__TEST_LEAK_BUCKET__.push(function () { return typeof moduleState; });'
      : '',
  ].join('\n  ');
  const leakStatement = leakStatements.trim();

  // Mimics a scoped service bundle: a container with an exposed component,
  // module-scope state, a remote-registered shared module, and a dispose hook
  // that reports through a host-owned log (reachable via proxy fallthrough).
  return `var global = hostGlobal;
(function() {
  var moduleState = { payload: new Array(4096).fill('service-heap') };
  function AppContainer() { return moduleState; }
  var context = global.__MICRO_FRONTEND__;
  var container = {
    name: 'remoteApp',
    exposeMap: { AppContainer: { __esModule: true, default: AppContainer } },
    config: {}
  };
  Object.defineProperty(context.__INSTANCES__, 'remoteApp', {
    value: context.__INSTANCES__.length,
    enumerable: false
  });
  context.__INSTANCES__.push(container);
  context.__SHARED__['service-local-lib'] = { get: function() { return moduleState; }, loaded: true };
  if (context.__DISPOSE__) {
    context.__DISPOSE__.push(function() { global.__TEST_HOOK_LOG__.push('hook-a'); });
    context.__DISPOSE__.push(function() { global.__TEST_HOOK_LOG__.push('hook-b'); });
  }
  ${leakStatement}
})();
`;
}

function createEvaluator(appName: string, options: { leakComponentToHost?: boolean; leakClosureToHost?: boolean } = {}) {
  const scopedSource = scopeBundleSource(createServiceSource(options), { appName, name: 'remoteApp' });
  let evaluateCount = 0;

  return {
    evaluate: async () => {
      evaluateCount += 1;
      new Function('hostGlobal', scopedSource)(testGlobal);
    },
    get evaluateCount() {
      return evaluateCount;
    },
  };
}

async function flushTimers(ms = 5) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createServiceManager', () => {
  it('exposes gc for canary collection', () => {
    expect(typeof testGlobal.gc).toBe('function');
  });

  it('loads a scoped service and mounts its exposed component', async () => {
    testGlobal.__TEST_HOOK_LOG__ = [];
    const manager = createServiceManager({ releaseGraceMs: 0 });
    const evaluator = createEvaluator('svc');

    const handle = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    handle.retain();
    const component = await handle.promise;

    expect(typeof component).toBe('function');
    expect(handle.read()).toBe(component);
    expect(handle.status).toBe('ready');
    expect(testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc).toBeDefined();
  });

  it('dedups concurrent loads into one evaluation and one scope', async () => {
    const manager = createServiceManager({ releaseGraceMs: 0 });
    const evaluator = createEvaluator('svc');

    const first = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    const second = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    first.retain();
    await first.promise;

    expect(second).toBe(first);
    expect(evaluator.evaluateCount).toBe(1);
  });

  it('disposes on release: unpublishes the scope, drains hooks LIFO, clears scope-registered shared entries', async () => {
    testGlobal.__TEST_HOOK_LOG__ = [];
    const disposeResults: ServiceDisposeResult[] = [];
    const manager = createServiceManager({ releaseGraceMs: 0, onDisposed: (result) => disposeResults.push(result) });
    const evaluator = createEvaluator('svc');

    const handle = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    handle.retain();
    await handle.promise;
    const context = testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc;
    expect(context?.__SHARED__['service-local-lib']).toBeDefined();

    handle.release();
    await flushTimers();

    expect(disposeResults).toHaveLength(1);
    expect(disposeResults[0]?.scopeUnpublished).toBe(true);
    expect(disposeResults[0]?.disposeHookErrors).toEqual([]);
    expect(testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc).toBeUndefined();
    expect(testGlobal.__TEST_HOOK_LOG__).toEqual(['hook-b', 'hook-a']);
    expect(context?.__INSTANCES__).toHaveLength(0);
    expect(Object.keys(context?.__SHARED__ ?? {})).toEqual([]);
    // Keep-entry policy: definitions stay for cheap re-mount.
    expect(testGlobal.__GRANITE_MICRO_FRONTEND_ENTRIES__?.svc).toBeDefined();
    expect(() => handle.read()).toThrow(ServiceDisposedError);
  });

  it('makes the disposed scope and component collectable (canary)', async () => {
    testGlobal.__TEST_HOOK_LOG__ = [];
    let canaries: ServiceCanaries | null = null;
    const manager = createServiceManager({
      releaseGraceMs: 0,
      onDisposed: (result) => {
        canaries = result.canaries;
      },
    });
    const evaluator = createEvaluator('svc');

    const handle = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    handle.retain();
    await handle.promise;
    handle.release();
    await flushTimers();

    expect(canaries).not.toBeNull();
    const collection = await areCanariesCollected(canaries!);
    expect(collection.contextCollected).toBe(true);
    expect(collection.componentCollected).toBe(true);
  });

  it('negative control: a component leaked into host state is reported as NOT collected', async () => {
    testGlobal.__TEST_HOOK_LOG__ = [];
    testGlobal.__TEST_LEAK_BUCKET__ = [];
    let canaries: ServiceCanaries | null = null;
    const manager = createServiceManager({
      releaseGraceMs: 0,
      onDisposed: (result) => {
        canaries = result.canaries;
      },
    });
    const evaluator = createEvaluator('svc', { leakComponentToHost: true });

    const handle = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    handle.retain();
    await handle.promise;
    handle.release();
    await flushTimers();

    const collection = await areCanariesCollected(canaries!);
    expect(collection.componentCollected).toBe(false);
  });

  it('a surviving service closure does not pin the disposed scope shell (entry locals are nulled)', async () => {
    testGlobal.__TEST_HOOK_LOG__ = [];
    testGlobal.__TEST_LEAK_BUCKET__ = [];
    let canaries: ServiceCanaries | null = null;
    const manager = createServiceManager({
      releaseGraceMs: 0,
      onDisposed: (result) => {
        canaries = result.canaries;
      },
    });
    const evaluator = createEvaluator('svc', { leakClosureToHost: true });

    const handle = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    handle.retain();
    await handle.promise;
    handle.release();
    await flushTimers();

    const collection = await areCanariesCollected(canaries!);
    // The leaked closure pins the variables it captures, but thanks to the
    // entry-locals cleanup hook it cannot reach the scope context anymore.
    expect(collection.contextCollected).toBe(true);
    expect(typeof (testGlobal.__TEST_LEAK_BUCKET__?.[0] as () => string)()).toBe('string');
  });

  it('stops scope-owned module timers on dispose and restarts them fresh on re-entry', async () => {
    testGlobal.__TEST_TICKS__ = [];
    const tickSource = `var global = hostGlobal;
(function() {
  var tick = 0;
  setInterval(function () {
    tick += 1;
    global.__TEST_TICKS__.push(tick);
  }, 10);
  var context = global.__MICRO_FRONTEND__;
  var container = {
    name: 'remoteApp',
    exposeMap: { AppContainer: { __esModule: true, default: function AppContainer() { return tick; } } },
    config: {}
  };
  Object.defineProperty(context.__INSTANCES__, 'remoteApp', {
    value: context.__INSTANCES__.length,
    enumerable: false
  });
  context.__INSTANCES__.push(container);
})();
`;
    const scopedSource = scopeBundleSource(tickSource, { appName: 'svc', name: 'remoteApp' });
    const evaluate = async () => {
      new Function('hostGlobal', scopedSource)(testGlobal);
    };
    const manager = createServiceManager({ releaseGraceMs: 0 });

    const first = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate });
    first.retain();
    await first.promise;
    await flushTimers(60);
    expect(testGlobal.__TEST_TICKS__.length).toBeGreaterThan(0);

    first.release();
    await flushTimers();
    const ticksAtDispose = testGlobal.__TEST_TICKS__.length;
    await flushTimers(60);
    // The module-scope interval must stop with the scope.
    expect(testGlobal.__TEST_TICKS__.length).toBe(ticksAtDispose);

    const second = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate });
    second.retain();
    await second.promise;
    await flushTimers(60);
    // Fresh module state on re-entry: the counter starts over at 1.
    expect(testGlobal.__TEST_TICKS__.length).toBeGreaterThan(ticksAtDispose);
    expect(testGlobal.__TEST_TICKS__[ticksAtDispose]).toBe(1);

    manager.unloadService('svc', { force: true });
    const ticksAtForcedUnload = testGlobal.__TEST_TICKS__.length;
    await flushTimers(60);
    expect(testGlobal.__TEST_TICKS__.length).toBe(ticksAtForcedUnload);
  });

  it('re-loads after dispose without re-evaluating the bundle (keep-entry) and with a fresh scope', async () => {
    testGlobal.__TEST_HOOK_LOG__ = [];
    const manager = createServiceManager({ releaseGraceMs: 0 });
    const evaluator = createEvaluator('svc');

    const first = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    first.retain();
    await first.promise;
    const firstContext = testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc;
    first.release();
    await flushTimers();

    const second = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    second.retain();
    const component = await second.promise;

    expect(second).not.toBe(first);
    expect(second.generation).toBeGreaterThan(first.generation);
    expect(evaluator.evaluateCount).toBe(1);
    expect(typeof component).toBe('function');
    expect(testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc).toBeDefined();
    expect(testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc).not.toBe(firstContext);
  });

  it('absorbs release/retain churn within the grace period (StrictMode double effects)', async () => {
    const manager = createServiceManager({ releaseGraceMs: 50 });
    const evaluator = createEvaluator('svc');

    const handle = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    handle.retain();
    await handle.promise;
    handle.release();
    handle.retain();
    await flushTimers(80);

    expect(handle.status).toBe('ready');
    expect(testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc).toBeDefined();
  });

  it('rejects an in-flight load on forced unload without publishing a scope', async () => {
    const manager = createServiceManager({ releaseGraceMs: 0 });
    let releaseEvaluate: () => void = () => {};
    const evaluate = () =>
      new Promise<void>((resolve) => {
        releaseEvaluate = resolve;
      });

    const handle = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate });
    handle.retain();
    const settled = handle.promise.catch((error) => error);

    manager.unloadService('svc', { force: true });
    releaseEvaluate();

    await expect(settled).resolves.toBeInstanceOf(ServiceDisposedError);
    expect(testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc).toBeUndefined();
  });

  it('a stale dispose cannot unpublish the next generation scope', async () => {
    const manager = createServiceManager({ releaseGraceMs: 10_000 });
    const evaluator = createEvaluator('svc');

    const first = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    first.retain();
    await first.promise;
    manager.unloadService('svc', { force: true });

    const second = manager.loadService('svc', { remotePath: REMOTE_PATH, evaluate: evaluator.evaluate });
    second.retain();
    await second.promise;
    const secondContext = testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc;

    // Releasing the disposed first handle must not affect the live scope.
    first.release();
    await flushTimers();

    expect(testGlobal.__GRANITE_MICRO_FRONTEND_SCOPES__?.svc).toBe(secondContext);
    expect(second.status).toBe('ready');
  });
});
