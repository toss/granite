import { type ServiceSessionEvent, parseServiceSessionEvent } from './serviceSession';

const NATIVE_MODULE_GLOBAL_KEY = '__GRANITE_SERVICE_SESSION_NATIVE__';

export interface ServiceSessionNativeSubscription {
  remove(): void;
}

export interface ServiceSessionNativeModule {
  evaluateServiceBundle(bundleRequest: string): Promise<void>;
  onSessionEvent(listener: (event: unknown) => void): ServiceSessionNativeSubscription;
}

export interface ServiceSessionHost {
  evaluate(bundleRequest: string): Promise<void>;
  subscribe(listener: (event: ServiceSessionEvent) => void): () => void;
}

function isServiceSessionNativeModule(value: unknown): value is ServiceSessionNativeModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'evaluateServiceBundle' in value &&
    typeof value.evaluateServiceBundle === 'function' &&
    'onSessionEvent' in value &&
    typeof value.onSessionEvent === 'function'
  );
}

export function getServiceSessionHost(): ServiceSessionHost | null {
  const nativeModule: unknown = Reflect.get(globalThis, NATIVE_MODULE_GLOBAL_KEY);
  if (!isServiceSessionNativeModule(nativeModule)) {
    return null;
  }

  return {
    evaluate: (bundleRequest) => nativeModule.evaluateServiceBundle(bundleRequest),
    subscribe: (listener) => {
      const subscription = nativeModule.onSessionEvent((nativeEvent) => {
        const event = parseServiceSessionEvent(nativeEvent);
        if (event != null) {
          listener(event);
        }
      });
      return () => subscription.remove();
    },
  };
}
