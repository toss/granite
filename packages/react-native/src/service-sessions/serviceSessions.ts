import {
  createDevelopmentServiceBundleRequestResolver,
  createServiceBundleLoader,
  createServiceGlobalGuard,
  type ServiceBundleRequestResolver,
} from '@granite-js/plugin-micro-frontend/runtime';
import type { ComponentType } from 'react';
import type { InitialProps } from '../initial-props';
import {
  createNativeServiceSessions,
  type NativeServiceSessions,
  ServiceSessionsUnavailableError,
} from './nativeServiceSessions';
import { parseServiceSessionEvent, type ServiceSessionEvent, type ServiceSessionEventMap } from './serviceSessionEvent';

export type { ServiceSessionEventMap } from './serviceSessionEvent';

const SERVICE_SESSION_CONTEXT_GLOBAL_KEY = '__GRANITE_SERVICE_SESSION_CONTEXT__';

export type ServiceComponent = ComponentType<InitialProps>;
export type ServiceModule = { readonly default: ServiceComponent };
export type ServiceSessionEventName = keyof ServiceSessionEventMap;
export type ServiceSessionEventListener<EventName extends ServiceSessionEventName> = (
  event: ServiceSessionEventMap[EventName]
) => void;

export interface ServiceSessionEventSubscription {
  remove(): void;
}

export interface ServiceSessions {
  addEventListener<EventName extends ServiceSessionEventName>(
    eventName: EventName,
    listener: ServiceSessionEventListener<EventName>
  ): ServiceSessionEventSubscription;
  importService(serviceName: string): Promise<ServiceModule>;
  close(identifier: string): Promise<void>;
}

type ServiceSessionListeners = {
  readonly [EventName in ServiceSessionEventName]: Set<ServiceSessionEventListener<EventName>>;
};

type ServiceSessionsOptions = {
  readonly native: NativeServiceSessions;
  readonly resolveBundleRequest?: ServiceBundleRequestResolver;
};

function getServiceKey(serviceName: string): string | null {
  const serviceKey = serviceName.trim().toLowerCase();
  return serviceKey.length === 0 ? null : serviceKey;
}

function isServiceModule(value: unknown): value is ServiceModule {
  return typeof value === 'object' && value !== null && 'default' in value && typeof value.default === 'function';
}

class DefaultServiceSessions implements ServiceSessions {
  private readonly listeners: ServiceSessionListeners = {
    openService: new Set(),
    closeService: new Set(),
    sessionVisibilityChanged: new Set(),
  };
  private readonly loader;
  private nativeSubscription: ServiceSessionEventSubscription | null = null;

  constructor(private readonly options: ServiceSessionsOptions) {
    this.loader = createServiceBundleLoader<ServiceComponent>({
      evaluate: (bundleRequest) => options.native.importService(bundleRequest),
      exposeName: 'AppContainer',
      getServiceKey,
      globalGuard: createServiceGlobalGuard({
        protectedKeys: ['__GRANITE_SERVICE_SESSION_NATIVE__', SERVICE_SESSION_CONTEXT_GLOBAL_KEY],
      }),
      parseExposedModule: (module) => (isServiceModule(module) ? module.default : null),
      ...(options.resolveBundleRequest == null ? {} : { resolveRequest: options.resolveBundleRequest }),
    });
  }

  addEventListener<EventName extends ServiceSessionEventName>(
    eventName: EventName,
    listener: ServiceSessionEventListener<EventName>
  ): ServiceSessionEventSubscription {
    const listeners = this.listeners[eventName];
    listeners.add(listener);
    this.subscribeToNativeEvents();

    return {
      remove: () => {
        listeners.delete(listener);
        this.unsubscribeWhenUnused();
      },
    };
  }

  async importService(serviceName: string): Promise<ServiceModule> {
    return { default: await this.loader.load(serviceName) };
  }

  close(identifier: string): Promise<void> {
    return this.options.native.close(identifier);
  }

  dispose(): void {
    this.nativeSubscription?.remove();
    this.nativeSubscription = null;
    this.listeners.openService.clear();
    this.listeners.closeService.clear();
    this.listeners.sessionVisibilityChanged.clear();
  }

  private subscribeToNativeEvents(): void {
    if (this.nativeSubscription != null) {
      return;
    }

    this.nativeSubscription = this.options.native.subscribe((value) => {
      const event = parseServiceSessionEvent(value);
      if (event != null) {
        this.emit(event);
      }
    });
  }

  private unsubscribeWhenUnused(): void {
    const listenerCount =
      this.listeners.openService.size + this.listeners.closeService.size + this.listeners.sessionVisibilityChanged.size;
    if (listenerCount === 0) {
      this.nativeSubscription?.remove();
      this.nativeSubscription = null;
    }
  }

  private emit(event: ServiceSessionEvent): void {
    switch (event.eventName) {
      case 'openService':
        this.listeners.openService.forEach((listener) => listener(event.body));
        return;
      case 'closeService':
        this.listeners.closeService.forEach((listener) => listener(event.body));
        return;
      case 'sessionVisibilityChanged':
        this.listeners.sessionVisibilityChanged.forEach((listener) => listener(event.body));
    }
  }
}

let currentServiceSessions: DefaultServiceSessions | null = null;
let currentInitializationKey: string | null = null;

export function initializeServiceSessions(initialProps: InitialProps): void {
  if (initialProps._monoHermes !== true) {
    return;
  }

  const initializationKey = [
    initialProps.platform,
    initialProps._serviceSessionBundleLoaderModuleName ?? '',
    initialProps._serviceSessionEventModuleName ?? '',
  ].join(':');
  if (currentServiceSessions != null && currentInitializationKey === initializationKey) {
    return;
  }

  currentServiceSessions?.dispose();
  currentInitializationKey = initializationKey;
  currentServiceSessions = new DefaultServiceSessions({
    native: createNativeServiceSessions(initialProps),
    ...(__DEV__
      ? {
          resolveBundleRequest: createDevelopmentServiceBundleRequestResolver({
            platform: initialProps.platform,
          }),
        }
      : {}),
  });
}

export const serviceSessions: ServiceSessions = {
  addEventListener: (eventName, listener) => {
    if (currentServiceSessions == null) {
      throw new ServiceSessionsUnavailableError();
    }
    return currentServiceSessions.addEventListener(eventName, listener);
  },
  importService: (serviceName) => {
    if (currentServiceSessions == null) {
      throw new ServiceSessionsUnavailableError();
    }
    return currentServiceSessions.importService(serviceName);
  },
  close: (identifier) => {
    if (currentServiceSessions == null) {
      throw new ServiceSessionsUnavailableError();
    }
    return currentServiceSessions.close(identifier);
  },
};
