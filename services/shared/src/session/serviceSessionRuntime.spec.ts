import { createContainer, exposeModule } from '@granite-js/plugin-micro-frontend/runtime';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServiceSessionEvent } from './serviceSession';
import { getServiceSessionHost } from './serviceSessionHost';
import { type ServiceComponent, createServiceSessionRuntime } from './serviceSessionRuntime';

const CatalogService: ServiceComponent = () => null;

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
        exposeModule(container, 'Service', { default: CatalogService });
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
        bundleRequest: 'catalog',
        url: 'service://catalog/products/42',
      },
    });
    const component = await runtime.load('catalog');
    unsubscribe();

    expect(receivedEvents).toEqual([
      {
        kind: 'open',
        identifier: 'session-1',
        bundleRequest: 'catalog',
        url: 'service://catalog/products/42',
      },
    ]);
    expect(component).toBe(CatalogService);
    expect(nativeListener).toBeNull();
  });

});
