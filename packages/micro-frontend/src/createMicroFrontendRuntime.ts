import { removePendingHostComponentRoutes } from './host/pendingHostComponentStore';
import { installContainerInit, type BeforeInitContainerHook } from './runtime/containerInit';
import { installContainerDefinitions } from './runtime/containerInstances';
import { createMicroFrontendRuntimeWithDependencies } from './runtime/createMicroFrontendRuntime';
import { parseNativeRuntimeEvent } from './runtime/parseNativeRuntimeEvent';
import { microFrontendModuleRegistry } from './runtime/registry';
import NativeGraniteMicroFrontendRuntime from './specs/NativeGraniteMicroFrontendRuntime';
import type { MicroFrontendAdapter, MicroFrontendLifecycleCallback, MicroFrontendRuntimeApi } from './types';

export interface CreateMicroFrontendRuntimeOptions {
  readonly adapter: MicroFrontendAdapter;
  readonly onLifecycleEvent?: MicroFrontendLifecycleCallback;
  readonly onPreloadError?: (error: unknown) => void;
  readonly hooks?: MicroFrontendRuntimeHooks;
}

export interface MicroFrontendRuntimeHooks {
  /**
   * Runs once per remote container (bundle evaluation built with `containerInit()`), before its code runs.
   * Return a `shareScope` to give that container its own view of shared modules.
   */
  readonly beforeInitContainer?: BeforeInitContainerHook;
  /**
   * Runs after each native preload request (`preloadApp` event), once the app is evaluated, also when it was evaluated
   * before. A preload can then always leave the app ready to open, e.g. by making an instance no session has used yet
   * (`runtime.instantiateApp`). Errors go to `onPreloadError`.
   */
  readonly afterPreloadApp?: (appName: string) => void | Promise<void>;
}

export function createMicroFrontendRuntime(options: CreateMicroFrontendRuntimeOptions): MicroFrontendRuntimeApi {
  installContainerInit(options.hooks?.beforeInitContainer);
  installContainerDefinitions();
  return createMicroFrontendRuntimeWithDependencies({
    adapter: options.adapter,
    nativeRuntime: NativeGraniteMicroFrontendRuntime,
    onLifecycleEvent: options.onLifecycleEvent,
    onPreloadError: options.onPreloadError ?? (() => undefined),
    afterPreloadApp: options.hooks?.afterPreloadApp,
    parseEvent: parseNativeRuntimeEvent,
    registry: microFrontendModuleRegistry,
    removePendingHostComponentRoutes,
  });
}
