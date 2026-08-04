import { BrickModule, type BrickModuleSpec } from 'brick-module';
import type { InitialProps } from '../initial-props';

const NATIVE_MODULE_GLOBAL_KEY = '__GRANITE_SERVICE_SESSION_NATIVE__';

export interface NativeServiceSessionSubscription {
  remove(): void;
}

export interface NativeServiceSessions {
  importService(bundleRequest: string): Promise<void>;
  close(identifier: string): Promise<void>;
  subscribe(listener: (event: unknown) => void): NativeServiceSessionSubscription;
}

interface GlobalNativeServiceSessions {
  evaluateServiceBundle(bundleRequest: string): Promise<void>;
  onSessionEvent(listener: (event: unknown) => void): NativeServiceSessionSubscription;
  closeServiceActivity?(identifier: string): Promise<void>;
}

interface ServiceBundleLoaderModule extends BrickModuleSpec {
  readonly importService: (bundleRequest: string) => Promise<unknown>;
  readonly closeServiceActivity: (identifier: string) => Promise<unknown>;
}

interface ServiceSessionEventModule extends BrickModuleSpec {
  readonly startServiceSessionEvents: () => Promise<unknown>;
  readonly onSendEvent: (listener: (event: unknown) => void) => NativeServiceSessionSubscription;
}

function isGlobalNativeServiceSessions(value: unknown): value is GlobalNativeServiceSessions {
  return (
    typeof value === 'object' &&
    value !== null &&
    'evaluateServiceBundle' in value &&
    typeof value.evaluateServiceBundle === 'function' &&
    'onSessionEvent' in value &&
    typeof value.onSessionEvent === 'function'
  );
}

export class ServiceSessionsUnavailableError extends Error {
  readonly name = 'ServiceSessionsUnavailableError';

  constructor() {
    super('The platform did not install Granite service sessions.');
  }
}

export function createNativeServiceSessions(initialProps: InitialProps): NativeServiceSessions {
  const globalNativeModule: unknown = Reflect.get(globalThis, NATIVE_MODULE_GLOBAL_KEY);
  if (isGlobalNativeServiceSessions(globalNativeModule)) {
    return {
      importService: (bundleRequest) => globalNativeModule.evaluateServiceBundle(bundleRequest),
      close: (identifier) => globalNativeModule.closeServiceActivity?.(identifier) ?? Promise.resolve(),
      subscribe: (listener) => globalNativeModule.onSessionEvent(listener),
    };
  }

  const bundleLoaderModuleName = initialProps._serviceSessionBundleLoaderModuleName;
  const eventModuleName = initialProps._serviceSessionEventModuleName;
  if (bundleLoaderModuleName == null || eventModuleName == null) {
    throw new ServiceSessionsUnavailableError();
  }

  const bundleLoaderModule = BrickModule.get<ServiceBundleLoaderModule>(bundleLoaderModuleName);
  const eventModule = BrickModule.get<ServiceSessionEventModule>(eventModuleName);

  return {
    importService: async (bundleRequest) => {
      await bundleLoaderModule.importService(bundleRequest);
    },
    close: async (identifier) => {
      await bundleLoaderModule.closeServiceActivity(identifier);
    },
    subscribe: (listener) => {
      const subscription = eventModule.onSendEvent(listener);
      void eventModule.startServiceSessionEvents();
      return subscription;
    },
  };
}
