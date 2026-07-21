import { createServiceBundleLoader, createServiceGlobalGuard } from '@granite-js/plugin-micro-frontend/runtime';
import type { InitialProps } from '@granite-js/react-native';
import type { ComponentType } from 'react';
import { getServiceKey } from './serviceRequest';
import type { ServiceSession, ServiceSessionEvent } from './serviceSession';
import type { ServiceSessionHost } from './serviceSessionHost';

export type ServiceComponentProps = {
  readonly initialProps: InitialProps;
  readonly session: ServiceSession;
};

export type ServiceComponent = ComponentType<ServiceComponentProps>;

export interface ServiceSessionRuntime {
  load(bundleRequest: string): Promise<ServiceComponent>;
  subscribe(listener: (event: ServiceSessionEvent) => void): () => void;
}

function isServiceModule(value: unknown): value is { readonly default: ServiceComponent } {
  return typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function';
}

export function createServiceSessionRuntime(host: ServiceSessionHost): ServiceSessionRuntime {
  const loader = createServiceBundleLoader<ServiceComponent>({
    evaluate: (bundleRequest) => host.evaluate(bundleRequest),
    exposeName: 'Service',
    getServiceKey,
    globalGuard: createServiceGlobalGuard({
      protectedKeys: ['__GRANITE_SERVICE_SESSION_NATIVE__'],
    }),
    parseExposedModule: (module) => (isServiceModule(module) ? module.default : null),
  });

  return {
    load: (bundleRequest) => loader.load(bundleRequest),
    subscribe: (listener) => host.subscribe(listener),
  };
}
