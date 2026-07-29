import {
  createContainer,
  createDevelopmentServiceBundleRequestResolver,
  exposeModule,
} from '@granite-js/plugin-micro-frontend/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceSessionEvent } from './serviceSession';
import { getServiceSessionHost } from './serviceSessionHost';
import { type AppContainerComponent, createServiceSessionRuntime } from './serviceSessionRuntime';

vi.mock('react-native', () => ({
  NativeEventEmitter: vi.fn(),
  NativeModules: {},
}));

const CatalogApp: AppContainerComponent = () => null;

describe('serviceSessionRuntime', () => {
  let nativeListener: ((event: unknown) => void) | null;

  beforeEach(() => {
    nativeListener = null;
    Reflect.set(globalThis, '__MICRO_FRONTEND__', {
      __INSTANCES__: [],
      __SHARED__: {},
    });
    Reflect.set(globalThis, '__GRANITE_SERVICE_SESSION_NATIVE__', {
      evaluateServiceBundle: async (bundleRequest: string) => {
        const container = createContainer(`${bundleRequest}-container`, {});
        exposeModule(container, 'AppContainer', { default: CatalogApp });
      },
      onSessionEvent: (listener: (event: unknown) => void) => {
        nativeListener = listener;
        return {
          remove: () => {
            nativeListener = null;
          },
        };
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__GRANITE_SERVICE_SESSION_NATIVE__');
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  });

  it('receives a native session event and resolves the service exposed by its evaluated bundle', async () => {
    const host = getServiceSessionHost();
    expect(host).not.toBeNull();
    if (host == null) {
      return;
    }

    const runtime = createServiceSessionRuntime(host);
    const receivedEvents: ServiceSessionEvent[] = [];
    const unsubscribe = runtime.subscribe((event) => receivedEvents.push(event));

    nativeListener?.({
      eventName: 'openService',
      body: {
        identifier: 'session-1',
        serviceName: 'catalog',
        url: 'granite://catalog/products/42',
      },
    });
    const component = await runtime.load('catalog');
    unsubscribe();

    expect(receivedEvents).toEqual([
      {
        kind: 'open',
        identifier: 'session-1',
        serviceName: 'catalog',
        url: 'granite://catalog/products/42',
      },
    ]);
    expect(component).toBe(CatalogApp);
    expect(nativeListener).toBeNull();
  });

  it('maps service names to stable sequential development bundle ports', async () => {
    // Given
    const importService = vi.fn(async (bundleRequest: string) => {
      const container = createContainer(`${bundleRequest}-container`, {});
      exposeModule(container, 'AppContainer', { default: CatalogApp });
    });
    const runtime = createServiceSessionRuntime(
      {
        importService,
        closeServiceActivity: async () => undefined,
        subscribe: () => () => undefined,
      },
      {
        resolveBundleRequest: createDevelopmentServiceBundleRequestResolver({
          platform: 'android',
        }),
      }
    );

    // When
    await runtime.load('car');
    await runtime.load('shopping');
    await runtime.load('car');

    // Then
    expect(importService).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8082/index.bundle?platform=android&dev=true&minify=false'
    );
    expect(importService).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8083/index.bundle?platform=android&dev=true&minify=false'
    );
    expect(importService).toHaveBeenCalledTimes(2);
  });
});
