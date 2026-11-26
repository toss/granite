import type { AppRequest } from '../types';
import {
  assignOwner,
  attachContainer,
  findOwnedCopy,
  findUnusedCopy,
  getCopy,
  hasCopies,
  withPendingOwnerSync,
} from './appInstances';
import { createContainerInstance, getContainerDefinition, removeContainerDefinition } from './containerInstances';
import { createContainer, exposeModule, getContainer, getExposedModule, removeContainer } from './containerRegistry';
import type { MicroFrontendModuleRegistry } from './createMicroFrontendRuntime';
import { ExposedModuleNotFoundError, SharedModuleAlreadyRegisteredError } from './errors';
import { getMicroFrontendGlobalContext, type MicroFrontendGlobalContext } from './globalContext';
import { toLegacyEsm } from './legacyEsm';
import { parseAppRequest } from './parseAppRequest';
import { registerLazySharedValue, registerSharedValue } from './sharedModule';
export { createContainer, exposeModule, getContainer, removeContainer };

export interface SharedModuleConfig {
  readonly eager?: boolean;
  /**
   * With `eager: true`, register the module at startup but evaluate it on the first `get()`
   * (the first consumer that reads it) instead of while the host bundle starts.
   * This is Module Federation's `eager: false` (provided, loaded on first use) with a
   * synchronous `get()`; Granite's `eager` keeps meaning "provided by this bundle".
   * Keep modules that must run at startup (polyfills, global setup) without it.
   */
  readonly lazy?: boolean;
}

export type SharedConfig = Readonly<Record<string, SharedModuleConfig>>;

export interface AppContainerConfig {
  readonly shared?: SharedConfig;
}

export interface AppContainerRuntime {
  readonly sourceURL: string;
}

export interface AppContainer {
  readonly appName: string;
  readonly config: AppContainerConfig;
  readonly exposedModules: Record<string, unknown>;
  readonly runtime?: AppContainerRuntime;
}

export type AppDisposeCallback = () => void | Promise<void>;

export interface RegisterAppDispose {
  (callback: AppDisposeCallback): () => void;
  (appName: string, callback: AppDisposeCallback): () => void;
}

interface SharedModule {
  readonly get: () => unknown;
  readonly loaded: boolean;
}

export interface MicroFrontendRuntimeContext {
  readonly containers: Record<string, AppContainer>;
  readonly dispose: RegisterAppDispose;
  readonly disposeCallbacksByApp: Record<string, Set<AppDisposeCallback>>;
  readonly sharedModules: Record<string, SharedModule>;
}

export function getMicroFrontendRuntimeContext(): MicroFrontendRuntimeContext {
  const context = getMicroFrontendGlobalContext();
  ensureRuntimeContext(context);
  return context;
}

export function registerShared(moduleName: string, module: unknown): void {
  const sharedModules = getMicroFrontendGlobalContext().__SHARED__;
  if (!registerSharedValue(sharedModules, moduleName, module, toLegacyEsm)) {
    throw new SharedModuleAlreadyRegisteredError(moduleName);
  }
}

export function registerLazyShared(moduleName: string, load: () => unknown): void {
  const sharedModules = getMicroFrontendGlobalContext().__SHARED__;
  if (!registerLazySharedValue(sharedModules, moduleName, load, toLegacyEsm)) {
    throw new SharedModuleAlreadyRegisteredError(moduleName);
  }
}

export async function disposeAppResources(appName: string): Promise<void> {
  const disposeCallbacks = getMicroFrontendRuntimeContext().disposeCallbacksByApp[appName];
  if (disposeCallbacks == null) {
    return;
  }

  await runAppDisposeCallbacks(disposeCallbacks);
}

export function hasContainer(appName: string): boolean {
  return getContainer(appName) != null;
}

export function importModule<TModule>(request: AppRequest): TModule {
  const { appName, exposedModule } = parseAppRequest(request);
  const container = getContainer(appName);
  const module = container == null ? null : getExposedModule(container, exposedModule);
  if (module == null) {
    throw new ExposedModuleNotFoundError(appName, exposedModule);
  }
  return module as TModule;
}

/** The app's first instance (the evaluation that defined its container) gets the container the evaluation registered. */
function attachFirstInstance(appName: string): void {
  const definition = getContainerDefinition(appName);
  const container = getContainer(appName);
  if (definition != null && container != null) {
    attachContainer(definition.instanceId, container);
  }
}

/**
 * Instance per session (see appInstances.ts): the module `request` names, from the app instance that belongs to the
 * session. That is the instance the session took before, else one no session has used yet, else a new instance.
 *
 * Every session gets the app's only instance, as before, when the app has no container definition (a bundle built
 * without containerInit(), or native without deferred evaluation), or when the session closed while it waited.
 */
export function importSessionModule<TModule>(
  request: AppRequest,
  session: { readonly sessionId: string; readonly isOpen: () => boolean }
): TModule {
  const { appName, exposedModule } = parseAppRequest(request);
  attachFirstInstance(appName);
  if (getContainerDefinition(appName) == null || !hasCopies(appName) || !session.isOpen()) {
    return importModule<TModule>(request);
  }
  let copy = findOwnedCopy(appName, session.sessionId) ?? findUnusedCopy(appName);
  if (copy == null) {
    // The new instance belongs to the session from its first module on (its init runs with the owner set).
    const instance = withPendingOwnerSync(appName, session.sessionId, () => createContainerInstance(appName));
    attachContainer(instance.instanceId, instance.container);
    copy = getCopy(instance.instanceId);
  }
  const container = copy?.container;
  if (copy == null || container == null) {
    throw new ExposedModuleNotFoundError(appName, exposedModule);
  }
  assignOwner(copy, session.sessionId);
  const module = getExposedModule(container, exposedModule);
  if (module == null) {
    throw new ExposedModuleNotFoundError(appName, exposedModule);
  }
  return module as TModule;
}

/**
 * After a native preload: leave exactly one instance of the app that no session has used yet, so the next session
 * opens at once. The first preload's evaluation is that instance; a later preload makes a new one only when every
 * instance belongs to a session.
 */
export function prepareUnusedInstance(appName: string): void {
  attachFirstInstance(appName);
  if (getContainerDefinition(appName) == null || findUnusedCopy(appName) != null) {
    return;
  }
  const instance = createContainerInstance(appName);
  attachContainer(instance.instanceId, instance.container);
}

function ensureRuntimeContext(
  context: MicroFrontendGlobalContext
): asserts context is MicroFrontendGlobalContext & MicroFrontendRuntimeContext {
  const containers = context.__CONTAINERS__;
  const sharedModules = context.__SHARED__;
  const propertyDescriptors = new Map<PropertyKey, PropertyDescriptor | undefined>();
  const runtimeProperties = {
    containers,
    dispose: isRegisterAppDispose(Reflect.get(context, 'dispose'))
      ? Reflect.get(context, 'dispose')
      : createRegisterAppDispose(),
    disposeCallbacksByApp: isDisposeCallbackRegistry(Reflect.get(context, 'disposeCallbacksByApp'))
      ? Reflect.get(context, 'disposeCallbacksByApp')
      : {},
    sharedModules,
  } satisfies MicroFrontendRuntimeContext;

  try {
    for (const property of Reflect.ownKeys(runtimeProperties)) {
      propertyDescriptors.set(property, Reflect.getOwnPropertyDescriptor(context, property));
      const value = Reflect.get(runtimeProperties, property);
      if (
        !Reflect.defineProperty(context, property, {
          configurable: true,
          enumerable: false,
          value,
          writable: true,
        })
      ) {
        throw new Error(`Cannot install micro-frontend runtime property '${String(property)}'`);
      }
    }
  } catch (error) {
    for (const [property, descriptor] of Array.from(propertyDescriptors).reverse()) {
      if (descriptor == null) {
        Reflect.deleteProperty(context, property);
      } else {
        Reflect.defineProperty(context, property, descriptor);
      }
    }
    throw error;
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function isRegisterAppDispose(value: unknown): value is RegisterAppDispose {
  return typeof value === 'function';
}

function isDisposeCallbackRegistry(value: unknown): value is Record<string, Set<AppDisposeCallback>> {
  return isObjectRecord(value) && Object.values(value).every(isDisposeCallbackSet);
}

function isDisposeCallbackSet(value: unknown): value is Set<AppDisposeCallback> {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof Reflect.get(value, 'add') === 'function' &&
    typeof Reflect.get(value, 'delete') === 'function' &&
    typeof Reflect.get(value, 'has') === 'function' &&
    typeof Reflect.get(value, Symbol.iterator) === 'function'
  );
}

function createRegisterAppDispose(): RegisterAppDispose {
  function dispose(callback: AppDisposeCallback): () => void;
  function dispose(appName: string, callback: AppDisposeCallback): () => void;
  function dispose(appNameOrCallback: string | AppDisposeCallback, callback?: AppDisposeCallback): () => void {
    if (typeof appNameOrCallback !== 'string' || callback == null) {
      throw new Error('dispose() must be compiled with the microFrontend plugin');
    }
    return registerAppDisposeCallback(getMicroFrontendRuntimeContext(), appNameOrCallback, callback);
  }

  return dispose;
}

function registerAppDisposeCallback(
  context: MicroFrontendRuntimeContext,
  appName: string,
  callback: AppDisposeCallback
): () => void {
  if (typeof appName !== 'string' || typeof callback !== 'function') {
    throw new Error('dispose() must be compiled with the microFrontend plugin');
  }

  const disposeCallbacks = (context.disposeCallbacksByApp[appName] ??= new Set());
  disposeCallbacks.add(callback);
  let isRegistered = true;

  return () => {
    if (!isRegistered) {
      return;
    }
    isRegistered = false;
    disposeCallbacks.delete(callback);
  };
}

async function runAppDisposeCallbacks(disposeCallbacks: Set<AppDisposeCallback>): Promise<void> {
  const callbacks = Array.from(disposeCallbacks).reverse();
  let firstDisposeError: unknown;
  let didDisposeFail = false;

  for (const dispose of callbacks) {
    try {
      await dispose();
    } catch (error) {
      if (!didDisposeFail) {
        firstDisposeError = error;
        didDisposeFail = true;
      }
    }
  }

  if (didDisposeFail) {
    throw firstDisposeError;
  }
}

export const microFrontendModuleRegistry: MicroFrontendModuleRegistry = {
  hasContainer,
  importModule,
  importSessionModule,
  prepareUnusedInstance,
  removeContainer(appName) {
    removeContainer(appName);
    removeContainerDefinition(appName);
  },
};
