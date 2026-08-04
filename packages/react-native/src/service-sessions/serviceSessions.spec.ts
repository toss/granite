import { createContainer, exposeModule } from '@granite-js/plugin-micro-frontend/runtime';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InitialProps } from '../initial-props';
import { initializeServiceSessions, serviceSessions } from './serviceSessions';

const getBrickModule = vi.hoisted(() => vi.fn());

vi.mock('brick-module', () => ({
  BrickModule: {
    get: getBrickModule,
  },
}));

const ShoppingService: ComponentType<InitialProps> = () => null;

describe('serviceSessions', () => {
  let sendNativeEvent: ((event: unknown) => void) | null;
  const importService = vi.fn(async (bundleRequest: string) => {
    const container = createContainer(`${bundleRequest}-container`, {});
    exposeModule(container, 'AppContainer', { default: ShoppingService });
  });
  const closeServiceActivity = vi.fn(async () => undefined);
  const removeNativeSubscription = vi.fn();
  const startServiceSessionEvents = vi.fn(async () => undefined);

  beforeEach(() => {
    sendNativeEvent = null;
    getBrickModule.mockImplementation((moduleName: string) => {
      if (moduleName === 'ServiceBundleLoader') {
        return {
          moduleName,
          importService,
          closeServiceActivity,
        };
      }

      return {
        moduleName,
        onSendEvent: (listener: (event: unknown) => void) => {
          sendNativeEvent = listener;
          return { remove: removeNativeSubscription };
        },
        startServiceSessionEvents,
      };
    });
    Reflect.set(globalThis, '__MICRO_FRONTEND__', {
      __INSTANCES__: [],
      __SHARED__: {},
    });

    initializeServiceSessions({
      platform: 'android',
      initialColorPreference: 'light',
      _monoHermes: true,
      _serviceSessionBundleLoaderModuleName: 'ServiceBundleLoader',
      _serviceSessionEventModuleName: 'ServiceSessionEvents',
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
    vi.clearAllMocks();
  });

  it('exposes native session events and lazy-compatible service imports through one Granite contract', async () => {
    // Given
    const onOpenService = vi.fn();
    const subscription = serviceSessions.addEventListener('openService', onOpenService);

    // When
    sendNativeEvent?.({
      eventName: 'openService',
      body: {
        identifier: 'shopping:1',
        serviceName: 'shopping',
        url: 'supertoss://m/shopping/product/1',
      },
    });
    const serviceModule = await serviceSessions.importService('shopping');
    await serviceSessions.close('shopping:1');
    subscription.remove();

    // Then
    expect(onOpenService).toHaveBeenCalledWith({
      identifier: 'shopping:1',
      serviceName: 'shopping',
      url: 'supertoss://m/shopping/product/1',
    });
    expect(serviceModule.default).toBe(ShoppingService);
    expect(importService).toHaveBeenCalledWith(
      'http://localhost:8082/index.bundle?platform=android&dev=true&minify=false'
    );
    expect(closeServiceActivity).toHaveBeenCalledWith('shopping:1');
    expect(startServiceSessionEvents).toHaveBeenCalledOnce();
    expect(removeNativeSubscription).toHaveBeenCalledOnce();
  });
});
