import type { AppRequest } from '../types';
import { createContainer, exposeModule, getContainer, getExposedModule, removeContainer } from './containerRegistry';
import type { MicroFrontendModuleRegistry } from './createMicroFrontendRuntime';
import { ExposedModuleNotFoundError, SharedModuleAlreadyRegisteredError } from './errors';
import { getMicroFrontendGlobalContext, type MicroFrontendGlobalContext } from './globalContext';
import { parseAppRequest } from './parseAppRequest';
export { createContainer, exposeModule, getContainer, removeContainer };

export interface SharedModuleConfig {
  readonly eager?: boolean;
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
  const existingModule = sharedModules[moduleName];
  if (existingModule != null) {
    if (isSharedModule(existingModule) && Object.is(existingModule.get(), module)) {
      return;
    }
    throw new SharedModuleAlreadyRegisteredError(moduleName);
  }
  sharedModules[moduleName] = {
    get: () => module,
    loaded: true,
  };
}

function isSharedModule(value: unknown): value is SharedModule {
  return (
    typeof value === 'object' &&
    value != null &&
    typeof Reflect.get(value, 'get') === 'function' &&
    typeof Reflect.get(value, 'loaded') === 'boolean'
  );
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
  removeContainer,
};
