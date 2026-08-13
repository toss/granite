import { removePendingHostComponentRoutes } from './host/pendingHostComponentStore';
import { createMicroFrontendRuntimeWithDependencies } from './runtime/createMicroFrontendRuntime';
import { parseNativeRuntimeEvent } from './runtime/parseNativeRuntimeEvent';
import { microFrontendModuleRegistry } from './runtime/registry';
import NativeGraniteMicroFrontendRuntime from './specs/NativeGraniteMicroFrontendRuntime';
import type { MicroFrontendAdapter, MicroFrontendRuntimeApi } from './types';

export interface CreateMicroFrontendRuntimeOptions {
  readonly adapter: MicroFrontendAdapter;
  readonly onPreloadError?: (error: unknown) => void;
}

export function createMicroFrontendRuntime(options: CreateMicroFrontendRuntimeOptions): MicroFrontendRuntimeApi {
  return createMicroFrontendRuntimeWithDependencies({
    adapter: options.adapter,
    nativeRuntime: NativeGraniteMicroFrontendRuntime,
    onPreloadError: options.onPreloadError ?? (() => undefined),
    parseEvent: parseNativeRuntimeEvent,
    registry: microFrontendModuleRegistry,
    removePendingHostComponentRoutes,
  });
}
