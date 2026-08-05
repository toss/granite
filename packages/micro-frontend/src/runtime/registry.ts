import type { AppRequest } from '../types';
import type { MicroFrontendModuleRegistry } from './createMicroFrontendRuntime';
import {
  AppContainerAlreadyRegisteredError,
  ExposedModuleAlreadyRegisteredError,
  ExposedModuleNotFoundError,
  SharedModuleAlreadyRegisteredError,
} from './errors';
import { parseAppRequest } from './parseAppRequest';

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

interface SharedModule {
  readonly get: () => unknown;
  readonly loaded: boolean;
}

export interface MicroFrontendRuntimeContext {
  readonly containers: Record<string, AppContainer>;
  readonly sharedModules: Record<string, SharedModule>;
}

declare global {
  var __GRANITE_MICRO_FRONTEND__: MicroFrontendRuntimeContext | undefined;
}

export function getMicroFrontendRuntimeContext(): MicroFrontendRuntimeContext {
  const existingContext = globalThis.__GRANITE_MICRO_FRONTEND__;
  if (existingContext != null) {
    return existingContext;
  }

  const context: MicroFrontendRuntimeContext = {
    containers: {},
    sharedModules: {},
  };
  globalThis.__GRANITE_MICRO_FRONTEND__ = context;
  return context;
}

export function createContainer(appName: string, config: AppContainerConfig = {}): AppContainer {
  const containers = getMicroFrontendRuntimeContext().containers;
  if (containers[appName] != null) {
    throw new AppContainerAlreadyRegisteredError(appName);
  }

  const container: AppContainer = {
    appName,
    config,
    exposedModules: {},
  };
  containers[appName] = container;
  return container;
}

export function exposeModule(container: AppContainer, exposedModule: string, module: unknown): void {
  const normalizedModule = normalizeExposedModule(exposedModule);
  if (container.exposedModules[normalizedModule] != null) {
    throw new ExposedModuleAlreadyRegisteredError(container.appName, normalizedModule);
  }
  container.exposedModules[normalizedModule] = module;
}

export function registerShared(moduleName: string, module: unknown): void {
  const sharedModules = getMicroFrontendRuntimeContext().sharedModules;
  const existingModule = sharedModules[moduleName];
  if (existingModule != null) {
    if (Object.is(existingModule.get(), module)) {
      return;
    }
    throw new SharedModuleAlreadyRegisteredError(moduleName);
  }
  sharedModules[moduleName] = {
    get: () => module,
    loaded: true,
  };
}

export function getContainer(appName: string): AppContainer | null {
  return getMicroFrontendRuntimeContext().containers[appName] ?? null;
}

export function removeContainer(appName: string): void {
  Reflect.deleteProperty(getMicroFrontendRuntimeContext().containers, appName);
}

export function hasContainer(appName: string): boolean {
  return getContainer(appName) != null;
}

export function importModule<TModule>(request: AppRequest): TModule {
  const { appName, exposedModule } = parseAppRequest(request);
  const module = getContainer(appName)?.exposedModules[exposedModule];
  if (module == null) {
    throw new ExposedModuleNotFoundError(appName, exposedModule);
  }
  return module as TModule;
}

function normalizeExposedModule(exposedModule: string): string {
  return exposedModule.startsWith('./') ? exposedModule : `./${exposedModule}`;
}

export const microFrontendModuleRegistry: MicroFrontendModuleRegistry = {
  hasContainer,
  importModule,
  removeContainer,
};
