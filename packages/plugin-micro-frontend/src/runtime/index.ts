export { createContainer } from './createContainer';
export { registerShared } from './registerShared';
export { exposeModule } from './exposeModule';
export {
  getContainer,
  getRegisteredRemoteEntry,
  getScopedRuntimeContext,
  deleteScopedRuntimeContext,
  parseRemotePath,
  importRemoteModule,
} from './utils';
export { createScopedRuntime } from './scopedRuntime';
export { createServiceManager, areCanariesCollected, ServiceDisposedError } from './serviceManager';
export { toDuplicateTolerantNativeComponentRegistry } from './nativeComponentRegistry';

export type {
  RuntimeContext,
  Container,
  ContainerConfig,
  Module,
  SharedModuleRegistry,
  MicroFrontendRemoteEntry,
  ScopedRemoteFactory,
  ScopedRuntime,
  ScopedRuntimeGlobal,
  ScopedRuntimeOptions,
} from './types';

export type {
  CanaryCollectionResult,
  LoadServiceOptions,
  ServiceCanaries,
  ServiceDisposeResult,
  ServiceHandle,
  ServiceManager,
  ServiceManagerOptions,
  ServiceStatus,
  UnloadServiceOptions,
} from './serviceManager';
