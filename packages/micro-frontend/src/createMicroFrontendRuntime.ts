import { createMicroFrontendRuntimeWithDependencies } from './runtime/createMicroFrontendRuntime';
import { parseNativeRuntimeEvent } from './runtime/parseNativeRuntimeEvent';
import { microFrontendModuleRegistry } from './runtime/registry';
import NativeGraniteMicroFrontendRuntime from './specs/NativeGraniteMicroFrontendRuntime';
import type { MicroFrontendAdapter, MicroFrontendRuntimeApi } from './types';

export interface CreateMicroFrontendRuntimeOptions {
  readonly adapter: MicroFrontendAdapter;
}

export function createMicroFrontendRuntime(options: CreateMicroFrontendRuntimeOptions): MicroFrontendRuntimeApi {
  return createMicroFrontendRuntimeWithDependencies({
    adapter: options.adapter,
    nativeRuntime: NativeGraniteMicroFrontendRuntime,
    parseEvent: parseNativeRuntimeEvent,
    registry: microFrontendModuleRegistry,
  });
}
