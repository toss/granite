import { rejectRuntimeContext } from './context';
import type { Module, RuntimeContext } from './types';
import { deleteScopedRuntimeContext, getRegisteredRemoteEntry, getScopedRuntimeContext, importRemoteModule } from './utils';

export type ServiceStatus = 'loading' | 'ready' | 'error' | 'disposed';

export class ServiceDisposedError extends Error {
  constructor(appName: string) {
    super(`'${appName}' service has been disposed`);
    this.name = 'ServiceDisposedError';
  }
}

export interface ServiceHandle {
  readonly appName: string;
  readonly generation: number;
  readonly status: ServiceStatus;
  readonly promise: Promise<Module>;
  /**
   * Suspense-style read: throws the pending promise while loading,
   * throws the load error after failure, and returns the exposed module
   * (component) once ready.
   */
  read(): Module;
  retain(): void;
  release(): void;
}

export interface ServiceCanaries {
  readonly context: WeakRef<object> | null;
  readonly component: WeakRef<object> | null;
}

export interface ServiceDisposeResult {
  readonly appName: string;
  readonly generation: number;
  readonly scopeUnpublished: boolean;
  readonly disposeHookErrors: unknown[];
  readonly canaries: ServiceCanaries | null;
}

export interface LoadServiceOptions {
  readonly remotePath: string;
  /**
   * Evaluates the service bundle into the current runtime (native bundle
   * loader in production, dev-server shim in development). Skipped when the
   * bundle's entry is already registered — re-mount reuses the evaluated
   * definitions and only re-runs the entry to build a fresh scope.
   */
  readonly evaluate: () => Promise<void>;
}

export interface UnloadServiceOptions {
  /**
   * Dispose immediately even when components still hold the handle.
   * Pending readers observe a ServiceDisposedError.
   */
  readonly force?: boolean;
}

export interface ServiceManagerOptions {
  /**
   * Grace period before an idle (refCount 0) service is disposed. Absorbs
   * StrictMode double-effects and immediate re-entry. Use 0 in tests.
   */
  readonly releaseGraceMs?: number;
  readonly onDisposed?: (result: ServiceDisposeResult) => void;
}

export interface ServiceManager {
  loadService(appName: string, options: LoadServiceOptions): ServiceHandle;
  unloadService(appName: string, options?: UnloadServiceOptions): ServiceDisposeResult | null;
  getServiceStatus(appName: string): ServiceStatus | null;
}

interface ServiceRecord {
  readonly appName: string;
  readonly generation: number;
  status: ServiceStatus;
  refCount: number;
  component: Module | null;
  error: unknown;
  context: RuntimeContext | null;
  promise: Promise<Module>;
  disposeRequested: boolean;
  disposeOnIdle: boolean;
  graceTimer: ReturnType<typeof setTimeout> | null;
  canaries: ServiceCanaries | null;
  handle: ServiceHandle;
}

const DEFAULT_RELEASE_GRACE_MS = 2000;

export function createServiceManager(managerOptions: ServiceManagerOptions = {}): ServiceManager {
  const releaseGraceMs = managerOptions.releaseGraceMs ?? DEFAULT_RELEASE_GRACE_MS;
  const records = new Map<string, ServiceRecord>();
  let nextGeneration = 1;

  function loadService(appName: string, options: LoadServiceOptions): ServiceHandle {
    const existing = records.get(appName);

    if (existing != null && existing.status !== 'disposed' && existing.status !== 'error') {
      cancelGraceTimer(existing);
      return existing.handle;
    }

    const record = createRecord(appName, options);
    records.set(appName, record);
    // The handle may never be retained (e.g. a suspended render that gets
    // discarded), so every record starts on the idle clock.
    scheduleIdleDispose(record);

    return record.handle;
  }

  function unloadService(appName: string, options: UnloadServiceOptions = {}): ServiceDisposeResult | null {
    const record = records.get(appName);

    if (record == null) {
      return null;
    }

    if (options.force === true || record.refCount === 0) {
      return disposeRecord(record);
    }

    record.disposeOnIdle = true;
    return null;
  }

  function getServiceStatus(appName: string): ServiceStatus | null {
    return records.get(appName)?.status ?? null;
  }

  function createRecord(appName: string, options: LoadServiceOptions): ServiceRecord {
    const record: ServiceRecord = {
      appName,
      generation: nextGeneration++,
      status: 'loading',
      refCount: 0,
      component: null,
      error: null,
      context: null,
      promise: undefined as unknown as Promise<Module>,
      disposeRequested: false,
      disposeOnIdle: false,
      graceTimer: null,
      canaries: null,
      handle: undefined as unknown as ServiceHandle,
    };

    record.promise = runLoad(record, options);
    record.promise.catch(() => undefined);
    record.handle = createHandle(record);

    return record;
  }

  async function runLoad(record: ServiceRecord, options: LoadServiceOptions): Promise<Module> {
    try {
      if (getRegisteredRemoteEntry(record.appName) == null) {
        await options.evaluate();
      }

      if (record.disposeRequested || isRecordDisposed(record)) {
        // No scope has been created yet, so there is nothing to clean up.
        throw new ServiceDisposedError(record.appName);
      }

      const entry = getRegisteredRemoteEntry(record.appName);

      if (entry == null) {
        throw new Error(`Micro frontend entry '${record.appName}' not found after bundle evaluation`);
      }

      entry();

      const context = getScopedRuntimeContext(record.appName);

      if (context == null) {
        throw new Error(`Micro frontend scope '${record.appName}' was not published by its entry`);
      }

      record.context = context;

      if (record.disposeRequested || isRecordDisposed(record)) {
        disposeRecord(record);
        throw new ServiceDisposedError(record.appName);
      }

      const module = importRemoteModule(options.remotePath, context);
      const component = module?.default ?? module;

      record.component = component;
      record.canaries = createCanaries(context, component);
      record.status = 'ready';

      return component;
    } catch (error) {
      if (!isRecordDisposed(record)) {
        record.status = 'error';
        record.error = error;
      }
      throw error;
    }
  }

  function createHandle(record: ServiceRecord): ServiceHandle {
    return {
      appName: record.appName,
      generation: record.generation,
      get status() {
        return record.status;
      },
      get promise() {
        return record.promise;
      },
      read() {
        if (record.status === 'ready') {
          return record.component;
        }

        if (record.status === 'error') {
          throw record.error;
        }

        if (record.status === 'disposed') {
          throw record.error ?? new ServiceDisposedError(record.appName);
        }

        throw record.promise;
      },
      retain() {
        record.refCount += 1;
        cancelGraceTimer(record);
      },
      release() {
        record.refCount = Math.max(0, record.refCount - 1);

        if (record.refCount > 0) {
          return;
        }

        if (record.disposeOnIdle) {
          disposeRecord(record);
          return;
        }

        scheduleIdleDispose(record);
      },
    };
  }

  function scheduleIdleDispose(record: ServiceRecord) {
    cancelGraceTimer(record);

    if (record.status === 'disposed') {
      return;
    }

    record.graceTimer = setTimeout(() => {
      record.graceTimer = null;

      if (record.refCount === 0) {
        disposeRecord(record);
      }
    }, releaseGraceMs);
  }

  function cancelGraceTimer(record: ServiceRecord) {
    if (record.graceTimer != null) {
      clearTimeout(record.graceTimer);
      record.graceTimer = null;
    }
  }

  function disposeRecord(record: ServiceRecord): ServiceDisposeResult {
    record.disposeRequested = true;

    if (record.status === 'disposed') {
      return createDisposeResult(record, false, []);
    }

    cancelGraceTimer(record);
    record.status = 'disposed';
    record.error = record.error ?? new ServiceDisposedError(record.appName);

    if (records.get(record.appName) === record) {
      records.delete(record.appName);
    }

    const context = record.context;
    let scopeUnpublished = false;
    const disposeHookErrors: unknown[] = [];

    if (context != null) {
      rejectRuntimeContext(context, `'${record.appName}' service scope has been disposed`);
      scopeUnpublished = deleteScopedRuntimeContext(record.appName, context);
      drainDisposeHooks(context, disposeHookErrors);
      clearRuntimeContextReferences(context);
    }

    record.component = null;
    record.context = null;
    // The settled load promise retains its resolved component; replace it so
    // a held handle no longer pins the disposed service's module graph.
    record.promise = Promise.reject(record.error);
    record.promise.catch(() => undefined);

    const result = createDisposeResult(record, scopeUnpublished, disposeHookErrors);
    managerOptions.onDisposed?.(result);

    return result;
  }

  function createDisposeResult(
    record: ServiceRecord,
    scopeUnpublished: boolean,
    disposeHookErrors: unknown[]
  ): ServiceDisposeResult {
    return {
      appName: record.appName,
      generation: record.generation,
      scopeUnpublished,
      disposeHookErrors,
      canaries: record.canaries,
    };
  }

  return { loadService, unloadService, getServiceStatus };
}

// Reading through a function keeps TS from control-flow narrowing
// `record.status`, which is mutated outside the checked function.
function isRecordDisposed(record: { status: ServiceStatus }): boolean {
  return record.status === 'disposed';
}

function drainDisposeHooks(context: RuntimeContext, errors: unknown[]) {
  const hooks = context.__DISPOSE__;

  if (!Array.isArray(hooks)) {
    return;
  }

  while (hooks.length > 0) {
    const hook = hooks.pop();

    try {
      hook?.();
    } catch (error) {
      errors.push(error);
    }
  }
}

function clearRuntimeContextReferences(context: RuntimeContext) {
  const instances = context.__INSTANCES__;

  for (const key of Object.getOwnPropertyNames(instances)) {
    if (key === 'length' || /^\d+$/.test(key)) {
      continue;
    }

    try {
      delete instances[key as keyof typeof instances];
    } catch {
      // Container name -> index markers are defined non-configurable; the
      // values are plain numbers, so leaving them retains nothing.
    }
  }

  instances.length = 0;

  const shared = context.__SHARED__;

  // Only own entries (registered by this scope) are removed. The prototype
  // is the host's shared registry itself and must stay untouched.
  for (const key of Object.keys(shared)) {
    delete shared[key];
  }
}

function createCanaries(context: RuntimeContext, component: Module): ServiceCanaries | null {
  if (typeof WeakRef !== 'function') {
    return null;
  }

  return {
    context: new WeakRef(context),
    component:
      component != null && (typeof component === 'object' || typeof component === 'function')
        ? new WeakRef(component)
        : null,
  };
}

export interface CanaryCollectionResult {
  readonly contextCollected: boolean | null;
  readonly componentCollected: boolean | null;
}

/**
 * Forces GC (when the engine exposes `gc()`) across multiple macrotasks —
 * `deref()` keeps its target alive for the rest of the current job, so each
 * round must yield before re-checking — and reports whether the disposed
 * service's canaries were collected.
 */
export async function areCanariesCollected(
  canaries: ServiceCanaries,
  options: { gcRounds?: number } = {}
): Promise<CanaryCollectionResult> {
  const gcRounds = options.gcRounds ?? 3;
  const gc = (globalThis as { gc?: () => void }).gc;

  for (let round = 0; round < gcRounds; round += 1) {
    gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return {
    contextCollected: canaries.context != null ? canaries.context.deref() === undefined : null,
    componentCollected: canaries.component != null ? canaries.component.deref() === undefined : null,
  };
}
