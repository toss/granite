import { removePendingHostComponentRoutes } from './host/pendingHostComponentStore';
import { installContainerInit, type BeforeInitContainerHook } from './runtime/containerInit';
import { installContainerDefinitions } from './runtime/containerInstances';
import { createMicroFrontendRuntimeWithDependencies } from './runtime/createMicroFrontendRuntime';
import { setInstanceIdFormat, type FormatInstanceId } from './runtime/instanceIds';
import { parseNativeRuntimeEvent } from './runtime/parseNativeRuntimeEvent';
import { microFrontendModuleRegistry } from './runtime/registry';
import NativeGraniteMicroFrontendRuntime from './specs/NativeGraniteMicroFrontendRuntime';
import type { MicroFrontendAdapter, MicroFrontendLifecycleCallback, MicroFrontendRuntimeApi } from './types';

export interface CreateMicroFrontendRuntimeOptions {
  readonly adapter: MicroFrontendAdapter;
  readonly onLifecycleEvent?: MicroFrontendLifecycleCallback;
  readonly onPreloadError?: (error: unknown) => void;
  readonly hooks?: MicroFrontendRuntimeHooks;
  /**
   * Give each session its own app instance: `importApp(request, { sessionId })` returns the module from the instance
   * that belongs to that session, and a native preload leaves one instance no session has used yet. An instance
   * never goes to another session, also after its session closed. A function is read on each import and preload,
   * so the host can decide on first use. Default: false (every session gets the app's only instance).
   */
  readonly instancePerSession?: boolean | (() => boolean);
  /**
   * Formats each app instance's id. Default: `<appName>@<sequence>` (`shopping@1`). `bundle` is what the adapter's
   * `loadBundle` returned for the evaluation that defined the instance's container, so a host can add what its loader
   * knows (for example a deployment id). Every id must be unique in the runtime.
   */
  readonly formatInstanceId?: FormatInstanceId;
}

export interface MicroFrontendRuntimeHooks {
  /**
   * Runs once per remote container (bundle evaluation built with `containerInit()`), before its code runs.
   * Return a `shareScope` to give that container its own view of shared modules.
   */
  readonly beforeInitContainer?: BeforeInitContainerHook;
}

export function createMicroFrontendRuntime(options: CreateMicroFrontendRuntimeOptions): MicroFrontendRuntimeApi {
  setInstanceIdFormat(options.formatInstanceId);
  installContainerInit(options.hooks?.beforeInitContainer);
  installContainerDefinitions();
  return createMicroFrontendRuntimeWithDependencies({
    adapter: options.adapter,
    nativeRuntime: NativeGraniteMicroFrontendRuntime,
    onLifecycleEvent: options.onLifecycleEvent,
    onPreloadError: options.onPreloadError ?? (() => undefined),
    instancePerSession:
      typeof options.instancePerSession === 'function'
        ? options.instancePerSession
        : () => options.instancePerSession === true,
    parseEvent: parseNativeRuntimeEvent,
    registry: microFrontendModuleRegistry,
    removePendingHostComponentRoutes,
  });
}
