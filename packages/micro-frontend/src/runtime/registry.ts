import type { AppRequest } from '../types';
import {
  createContainer,
  exposeModule,
  getContainer,
  getExposedModule,
  hasContainer,
  removeContainer,
} from './containerRegistry';
import type { MicroFrontendModuleRegistry } from './createMicroFrontendRuntime';
import { ExposedModuleNotFoundError, SharedModuleAlreadyRegisteredError } from './errors';
import { getMicroFrontendGlobalContext } from './globalContext';
import { parseAppRequest } from './parseAppRequest';
export { createContainer, exposeModule, getContainer, hasContainer, removeContainer };

export interface SharedModuleConfig {
  readonly eager?: boolean;
}

export type SharedConfig = Readonly<Record<string, SharedModuleConfig>>;

export interface AppContainerConfig {
  readonly shared?: SharedConfig;
}

export interface AppContainer {
  readonly appName: string;
  readonly config: AppContainerConfig;
  readonly exposedModules: Record<string, unknown>;
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

declare global {
  var _graniteMicroFrontend: MicroFrontendRuntimeContext | undefined;
}

export function getMicroFrontendRuntimeContext(): MicroFrontendRuntimeContext {
  getMicroFrontendGlobalContext();
  const existingContext = globalThis._graniteMicroFrontend;
  if (existingContext != null) {
    ensureLifecycleContext(existingContext);
    return existingContext;
  }

  const context: MicroFrontendRuntimeContext = {
    containers: {},
    dispose: createRegisterAppDispose(),
    disposeCallbacksByApp: {},
    sharedModules: {},
  };
  globalThis._graniteMicroFrontend = context;
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
  const disposeCallbacks = globalThis._graniteMicroFrontend?.disposeCallbacksByApp?.[appName];
  if (disposeCallbacks == null) {
    return;
  }

  await runAppDisposeCallbacks(disposeCallbacks);
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

function ensureLifecycleContext(context: MicroFrontendRuntimeContext): void {
  const mutableContext = context as unknown as {
    dispose?: RegisterAppDispose;
    disposeCallbacksByApp?: Record<string, Set<AppDisposeCallback>>;
  };
  mutableContext.disposeCallbacksByApp ??= {};
  mutableContext.dispose ??= createRegisterAppDispose();
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
