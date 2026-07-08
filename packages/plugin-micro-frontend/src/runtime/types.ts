/* eslint-disable @typescript-eslint/naming-convention */
import type { ExposeConfig, RemoteConfig, SharedConfig } from '../types';

declare global {
  var __MICRO_FRONTEND__: RuntimeContext;
  var __GRANITE_MICRO_FRONTEND_ENTRIES__: Record<string, MicroFrontendRemoteEntry> | undefined;
  var __GRANITE_MICRO_FRONTEND_SCOPES__: Record<string, RuntimeContext> | undefined;
}

export interface RuntimeContext {
  __INSTANCES__: Container[] & Record<string, number>;
  __SHARED__: SharedModuleRegistry;
  /**
   * Cleanup hooks drained (LIFO) when the scope is disposed. Installed by the
   * scope-bundle transform; absent on the host's default context.
   */
  __DISPOSE__?: Array<() => void>;
}

export interface Container {
  name: string;
  exposeMap: Record<string, Module>;
  config: ContainerConfig;
}

export type ContainerConfig = {
  readonly remote?: RemoteConfig;
  readonly shared?: SharedConfig;
  readonly exposes?: ExposeConfig;
};

export interface SharedModuleRegistry {
  [libName: string]: {
    get: () => Module;
    loaded: boolean;
  };
}

export type Module = any;

export type ScopedRuntimeGlobal = Record<string, unknown>;

export type ScopedRuntimeGlobalFor<Global extends object> = Global & ScopedRuntimeGlobal;

export type MicroFrontendRemoteEntry = (
  global?: ScopedRuntimeGlobal,
  globalThis?: ScopedRuntimeGlobal,
  window?: ScopedRuntimeGlobal,
  self?: ScopedRuntimeGlobal
) => unknown;

export interface ScopedRuntimeOptions<Global extends object = ScopedRuntimeGlobal> {
  global?: Global;
}

export type ScopedRemoteFactory<Result = unknown, Global extends object = ScopedRuntimeGlobal> = (
  this: ScopedRuntimeGlobalFor<Global>,
  global: ScopedRuntimeGlobalFor<Global>,
  globalThis: ScopedRuntimeGlobalFor<Global>,
  window: ScopedRuntimeGlobalFor<Global>,
  self: ScopedRuntimeGlobalFor<Global>
) => Result;

export interface ScopedRuntime<Global extends object = ScopedRuntimeGlobal> {
  readonly global: ScopedRuntimeGlobalFor<Global>;
  readonly context: RuntimeContext;
  createContainer(name: string, config: ContainerConfig): Container;
  registerShared(libName: string, module: Module): void;
  exposeModule(container: Container, exposeName: string, module: Module): void;
  getContainer(instanceName: string): Container | null;
  importRemoteModule(remoteRequestPath: string): Module;
  evaluate<Result>(factory: ScopedRemoteFactory<Result, Global>): Result;
  dispose(): void;
}
