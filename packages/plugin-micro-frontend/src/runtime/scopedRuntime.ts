import {
  createRuntimeContext,
  isPromiseLike,
  rejectRuntimeContext,
  removeActiveRuntimeContext,
  runWithRuntimeContext,
} from './context';
import { createContainer } from './createContainer';
import { exposeModule } from './exposeModule';
import { registerShared } from './registerShared';
import type {
  ScopedRemoteFactory,
  ScopedRuntime,
  ScopedRuntimeGlobal,
  ScopedRuntimeGlobalFor,
  ScopedRuntimeOptions,
} from './types';
import { getContainer, importRemoteModule } from './utils';

const GLOBAL_ALIASES = new Set<PropertyKey>(['global', 'globalThis', 'window', 'self']);
const ASYNC_FUNCTION_CONSTRUCTOR_NAME = 'AsyncFunction';
const SYNC_FACTORY_ERROR_MESSAGE = 'Scoped runtime factories must be synchronous';

export function createScopedRuntime<Global extends object = ScopedRuntimeGlobal>(
  options: ScopedRuntimeOptions<Global> = {}
): ScopedRuntime<Global> {
  const hostGlobal = options.global ?? globalThis;
  const context = createRuntimeContext();
  const scopeTarget = Object.create(null) as ScopedRuntimeGlobalFor<Global>;
  const scopeOwnedProperties = new Set<PropertyKey>();
  const timeoutHandles = new Set<unknown>();
  const intervalHandles = new Set<unknown>();
  const animationFrameHandles = new Set<unknown>();
  let disposed = false;
  let scopedGlobal: ScopedRuntimeGlobalFor<Global> = scopeTarget;

  function assertActive() {
    if (disposed) {
      throw new Error('Runtime scope has been disposed');
    }
  }

  function getHostValue(property: PropertyKey, receiver: unknown) {
    return Reflect.get(hostGlobal, property, receiver);
  }

  function getHostFunction(property: PropertyKey) {
    const value = Reflect.get(hostGlobal, property);
    return typeof value === 'function' ? value : null;
  }

  function createTimerStartWrapper(property: PropertyKey, handles: Set<unknown>) {
    return (...args: unknown[]) => {
      assertActive();

      const timerStart = getHostFunction(property);
      if (timerStart == null) {
        throw new Error(`Scoped global does not provide ${String(property)}`);
      }

      const handle = Reflect.apply(timerStart, hostGlobal, args);
      handles.add(handle);
      return handle;
    };
  }

  function createTimerClearWrapper(property: PropertyKey, handles: Set<unknown>) {
    return (handle: unknown) => {
      handles.delete(handle);

      const timerClear = getHostFunction(property);
      if (timerClear != null) {
        Reflect.apply(timerClear, hostGlobal, [handle]);
      }
    };
  }

  function clearTrackedHandles(property: PropertyKey, handles: Set<unknown>) {
    const timerClear = getHostFunction(property);
    if (timerClear == null) {
      handles.clear();
      return;
    }

    for (const handle of handles) {
      Reflect.apply(timerClear, hostGlobal, [handle]);
    }

    handles.clear();
  }

  const handler: ProxyHandler<ScopedRuntimeGlobalFor<Global>> = {
    get(target, property, receiver) {
      if (property === '__MICRO_FRONTEND__') {
        return context;
      }

      if (Reflect.has(target, property)) {
        return Reflect.get(target, property, receiver);
      }

      if (GLOBAL_ALIASES.has(property)) {
        return scopedGlobal;
      }

      switch (property) {
        case 'setTimeout':
          return createTimerStartWrapper(property, timeoutHandles);
        case 'clearTimeout':
          return createTimerClearWrapper(property, timeoutHandles);
        case 'setInterval':
          return createTimerStartWrapper(property, intervalHandles);
        case 'clearInterval':
          return createTimerClearWrapper(property, intervalHandles);
        case 'requestAnimationFrame':
          return createTimerStartWrapper(property, animationFrameHandles);
        case 'cancelAnimationFrame':
          return createTimerClearWrapper(property, animationFrameHandles);
        default:
          return getHostValue(property, receiver);
      }
    },
    set(target, property, value, receiver) {
      assertActive();
      scopeOwnedProperties.add(property);
      return Reflect.set(target, property, value, receiver);
    },
    defineProperty(target, property, descriptor) {
      assertActive();

      if (descriptor.configurable !== true) {
        throw new Error('Scoped runtime globals must be configurable');
      }

      scopeOwnedProperties.add(property);
      return Reflect.defineProperty(target, property, {
        ...descriptor,
        configurable: true,
      });
    },
    deleteProperty(target, property) {
      assertActive();
      scopeOwnedProperties.delete(property);
      return Reflect.deleteProperty(target, property);
    },
    has(target, property) {
      return property === '__MICRO_FRONTEND__' || Reflect.has(target, property) || Reflect.has(hostGlobal, property);
    },
  };

  scopedGlobal = new Proxy(scopeTarget, handler);

  function evaluate<Result>(factory: ScopedRemoteFactory<Result, Global>) {
    assertActive();

    if (factory.constructor.name === ASYNC_FUNCTION_CONSTRUCTOR_NAME) {
      throw new Error(SYNC_FACTORY_ERROR_MESSAGE);
    }

    const result = runWithRuntimeContext(context, () =>
      factory.call(scopedGlobal, scopedGlobal, scopedGlobal, scopedGlobal, scopedGlobal)
    );

    if (isPromiseLike(result)) {
      rejectRuntimeContext(context, SYNC_FACTORY_ERROR_MESSAGE);
      throw new Error(SYNC_FACTORY_ERROR_MESSAGE);
    }

    return result;
  }

  function dispose() {
    if (disposed) {
      return;
    }

    rejectRuntimeContext(context, 'Runtime scope has been disposed');
    removeActiveRuntimeContext(context);

    clearTrackedHandles('clearTimeout', timeoutHandles);
    clearTrackedHandles('clearInterval', intervalHandles);
    clearTrackedHandles('cancelAnimationFrame', animationFrameHandles);

    for (const property of scopeOwnedProperties) {
      Reflect.deleteProperty(scopeTarget, property);
    }

    scopeOwnedProperties.clear();
    disposed = true;
  }

  return {
    global: scopedGlobal,
    context,
    createContainer: (name, config) => createContainer(name, config, context),
    registerShared: (libName, module) => registerShared(libName, module, context),
    exposeModule,
    getContainer: (name) => getContainer(name, context),
    importRemoteModule: (remoteRequestPath) => importRemoteModule(remoteRequestPath, context),
    evaluate,
    dispose,
  };
}
