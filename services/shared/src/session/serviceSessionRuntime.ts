import { createServiceBundleLoader, createServiceGlobalGuard } from '@granite-js/plugin-micro-frontend/runtime';
import type { InitialProps } from '@granite-js/react-native';
import type { ComponentType } from 'react';
import { getServiceKey } from './serviceRequest';
import type { ServiceSessionEvent } from './serviceSession';
import type { ServiceSessionHost } from './serviceSessionHost';

const SERVICE_SESSION_CONTEXT_GLOBAL_KEY = '__GRANITE_SERVICE_SESSION_CONTEXT__';

export type AppContainerComponent = ComponentType<InitialProps>;

export interface ServiceSessionRuntime {
  load(bundleRequest: string): Promise<AppContainerComponent>;
  closeServiceActivity(identifier: string): Promise<void>;
  subscribe(listener: (event: ServiceSessionEvent) => void): () => void;
}

function isAppContainerModule(value: unknown): value is { readonly default: AppContainerComponent } {
  return typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function';
}

export function createServiceSessionRuntime(host: ServiceSessionHost): ServiceSessionRuntime {
  const loader = createServiceBundleLoader<AppContainerComponent>({
    evaluate: (bundleRequest) => host.importService(bundleRequest),
    exposeName: 'AppContainer',
    getServiceKey,
    globalGuard: createServiceGlobalGuard({
      protectedKeys: ['__GRANITE_SERVICE_SESSION_NATIVE__', SERVICE_SESSION_CONTEXT_GLOBAL_KEY],
    }),
    parseExposedModule: (module) => (isAppContainerModule(module) ? module.default : null),
  });

  return {
    load: (bundleRequest) => loader.load(bundleRequest),
    closeServiceActivity: (identifier) => host.closeServiceActivity(identifier),
    subscribe: (listener) => host.subscribe(listener),
  };
}
