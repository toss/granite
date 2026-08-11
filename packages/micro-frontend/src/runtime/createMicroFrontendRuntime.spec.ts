import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerPendingHostComponentRoute,
  removePendingHostComponentRoutes,
  resetPendingHostComponentStoreForTest,
  resolvePendingHostComponent,
} from '../host/pendingHostComponentStore';
import type { MicroFrontendRuntimeEvent } from '../types';
import {
  createMicroFrontendRuntimeWithDependencies,
  type NativeMicroFrontendRuntime,
  type NativeMicroFrontendRuntimeEvent,
} from './createMicroFrontendRuntime';
import { parseNativeRuntimeEvent } from './parseNativeRuntimeEvent';
import { createContainer, exposeModule, microFrontendModuleRegistry } from './registry';

interface AppModule {
  readonly default: () => string;
}

function CartPendingComponent() {
  return null;
}

function createRuntimeFixture() {
  const listeners = new Set<(event: NativeMicroFrontendRuntimeEvent) => void>();
  const adapter = {
    loadBundle: vi.fn(async ({ appName }: { readonly appName: string }) => ({
      filePath: `/bundles/${appName}.hbc`,
    })),
  };
  const nativeRuntime: NativeMicroFrontendRuntime = {
    evaluateScript: vi.fn(async () => undefined),
    requestCloseSession: vi.fn(async () => undefined),
    startEventDelivery: vi.fn(),
    onEvent(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const runtime = createMicroFrontendRuntimeWithDependencies({
    adapter,
    nativeRuntime,
    registry: microFrontendModuleRegistry,
    removePendingHostComponentRoutes,
    parseEvent: parseNativeRuntimeEvent,
  });

  return {
    adapter,
    emit: (event: NativeMicroFrontendRuntimeEvent) => {
      listeners.forEach((listener) => listener(event));
    },
    nativeRuntime,
    runtime,
  };
}

describe('createMicroFrontendRuntimeWithDependencies', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
    resetPendingHostComponentStoreForTest();
  });

  it('loads and evaluates an app once before importing its exposed module', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const appModule: AppModule = { default: () => 'cart' };
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      const container = createContainer('cart');
      exposeModule(container, './App', appModule);
    });

    // When
    const [first, second] = await Promise.all([
      fixture.runtime.importApp<AppModule>('cart/App'),
      fixture.runtime.importApp<AppModule>('cart/App'),
    ]);

    // Then
    expect(first).toBe(appModule);
    expect(second).toBe(appModule);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledTimes(1);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledWith({ appName: 'cart' });
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledOnce();
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledWith({
      filePath: '/bundles/cart.hbc',
    });
  });

  it('removes a failed evaluation so the next preload can retry', async () => {
    // Given
    const fixture = createRuntimeFixture();
    vi.mocked(fixture.nativeRuntime.evaluateScript)
      .mockImplementationOnce(async () => {
        createContainer('catalog');
        throw new Error('evaluation failed');
      })
      .mockImplementationOnce(async () => {
        createContainer('catalog');
      });

    // When
    const failedPreload = fixture.runtime.preloadApp('catalog');

    // Then
    await expect(failedPreload).rejects.toThrow('evaluation failed');
    expect(microFrontendModuleRegistry.hasContainer('catalog')).toBe(false);
    await expect(fixture.runtime.preloadApp('catalog')).resolves.toBeUndefined();
    expect(fixture.adapter.loadBundle).toHaveBeenCalledTimes(2);
  });

  it('delegates session close and forwards parsed native events', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const listener = vi.fn<(event: MicroFrontendRuntimeEvent) => void>();
    const subscription = fixture.runtime.onEvent(listener);
    const event = {
      name: 'openApp',
      params: {
        appName: 'cart',
        scheme: 'granite://cart/products/1',
        sessionId: 'session-1',
      },
    } satisfies NativeMicroFrontendRuntimeEvent;

    // When
    fixture.emit(event);
    await fixture.runtime.closeSession('session-1');
    subscription.remove();
    fixture.emit(event);

    // Then
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
    expect(fixture.nativeRuntime.requestCloseSession).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
    expect(fixture.nativeRuntime.startEventDelivery).toHaveBeenCalledOnce();
  });

  it('releases app resources after its last native session closes', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const firstModule: AppModule = { default: () => 'first cart' };
    const secondModule: AppModule = { default: () => 'second cart' };
    fixture.runtime.onEvent(() => undefined);
    vi.mocked(fixture.nativeRuntime.evaluateScript)
      .mockImplementationOnce(async () => {
        const container = createContainer('cart');
        exposeModule(container, './App', firstModule);
        registerPendingHostComponentRoute('/products', {
          app: { host: 'app', name: 'cart', scheme: 'granite' },
          component: CartPendingComponent,
        });
      })
      .mockImplementationOnce(async () => {
        const container = createContainer('cart');
        exposeModule(container, './App', secondModule);
      });
    fixture.emit({
      name: 'openApp',
      params: {
        appName: 'cart',
        scheme: 'granite://app/cart/products',
        sessionId: 'session-1',
      },
    });
    await expect(fixture.runtime.importApp<AppModule>('cart/App')).resolves.toBe(firstModule);

    // When
    fixture.emit({ name: 'closeApp', params: { sessionId: 'session-1' } });

    // Then
    expect(microFrontendModuleRegistry.hasContainer('cart')).toBe(false);
    expect(() => microFrontendModuleRegistry.importModule('cart/App')).toThrow();
    expect(resolvePendingHostComponent('granite://app/cart/products')).toBeNull();
    fixture.emit({
      name: 'openApp',
      params: {
        appName: 'cart',
        scheme: 'granite://app/cart/products',
        sessionId: 'session-2',
      },
    });
    await expect(fixture.runtime.importApp<AppModule>('cart/App')).resolves.toBe(secondModule);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledTimes(2);
  });

  it('keeps app resources while another native session remains open', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const appModule: AppModule = { default: () => 'cart' };
    fixture.runtime.onEvent(() => undefined);
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      const container = createContainer('cart');
      exposeModule(container, './App', appModule);
    });
    fixture.emit({
      name: 'openApp',
      params: { appName: 'cart', scheme: 'granite://app/cart/products', sessionId: 'session-1' },
    });
    fixture.emit({
      name: 'openApp',
      params: { appName: 'cart', scheme: 'granite://app/cart/products', sessionId: 'session-2' },
    });
    await fixture.runtime.importApp<AppModule>('cart/App');

    // When
    fixture.emit({ name: 'closeApp', params: { sessionId: 'session-1' } });

    // Then
    await expect(fixture.runtime.importApp<AppModule>('cart/App')).resolves.toBe(appModule);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledOnce();
  });

});
