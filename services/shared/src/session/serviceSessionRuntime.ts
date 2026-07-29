import {
  createServiceBundleLoader,
  createServiceGlobalGuard,
  type ServiceBundleRequestResolver,
} from '@granite-js/plugin-micro-frontend/runtime';
import type { InitialProps } from '@granite-js/react-native';
import type { ComponentType } from 'react';
import { getServiceKey } from './serviceRequest';
import type { ServiceSessionEvent } from './serviceSession';
import type { ServiceSessionHost } from './serviceSessionHost';

const SERVICE_SESSION_CONTEXT_GLOBAL_KEY = '__GRANITE_SERVICE_SESSION_CONTEXT__';

export type AppContainerComponent = ComponentType<InitialProps>;

export interface ServiceSessionRuntime {
  load(serviceName: string): Promise<AppContainerComponent>;
  closeServiceActivity(identifier: string): Promise<void>;
  subscribe(listener: (event: ServiceSessionEvent) => void): () => void;
}

export interface ServiceSessionRuntimeOptions {
  readonly resolveBundleRequest?: ServiceBundleRequestResolver;
}

function isAppContainerModule(value: unknown): value is { readonly default: AppContainerComponent } {
  return typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function';
}

export function createServiceSessionRuntime(
  host: ServiceSessionHost,
  options: ServiceSessionRuntimeOptions = {}
): ServiceSessionRuntime {
  const loader = createServiceBundleLoader<AppContainerComponent>({
    evaluate: (bundleRequest) => host.importService(bundleRequest),
    exposeName: 'AppContainer',
    getServiceKey,
    globalGuard: createServiceGlobalGuard({
      protectedKeys: ['__GRANITE_SERVICE_SESSION_NATIVE__', SERVICE_SESSION_CONTEXT_GLOBAL_KEY],
    }),
    parseExposedModule: (module) => (isAppContainerModule(module) ? module.default : null),
    ...(options.resolveBundleRequest == null ? {} : { resolveRequest: options.resolveBundleRequest }),
  });

  return {
    load: (serviceName) => loader.load(serviceName),
    closeServiceActivity: (identifier) => host.closeServiceActivity(identifier),
    subscribe: (listener) => host.subscribe(listener),
  };
}
