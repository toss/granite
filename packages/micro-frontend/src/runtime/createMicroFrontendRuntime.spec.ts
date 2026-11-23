import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerPendingHostComponentRoute,
  removePendingHostComponentRoutes,
  resetPendingHostComponentStoreForTest,
  resolvePendingHostComponent,
} from '../host/pendingHostComponentStore';
import type { MicroFrontendSessionEvent } from '../types';
import { defineContainer, removeContainerDefinition } from './containerInstances';
import {
  createMicroFrontendRuntimeWithDependencies,
  type NativeMicroFrontendRuntime,
  type NativeMicroFrontendRuntimeEvent,
} from './createMicroFrontendRuntime';
import { getMicroFrontendGlobalContext } from './globalContext';
import { parseNativeRuntimeEvent } from './parseNativeRuntimeEvent';
import { createContainer, exposeModule, microFrontendModuleRegistry } from './registry';

const NATIVE_COMPONENT_REGISTRY_MODULE = 'react-native/Libraries/NativeComponent/NativeComponentRegistry';

interface AppModule {
  readonly default: () => string;
}

function CartPendingComponent() {
  return null;
}

function createRuntimeFixture(options: { afterPreloadApp?: (appName: string) => void | Promise<void> } = {}) {
  const listeners = new Set<(event: NativeMicroFrontendRuntimeEvent) => void>();
  const adapter = {
    loadBundle: vi.fn(async ({ appName }: { readonly appName: string }) => ({
      filePath: `/bundles/${appName}.hbc`,
    })),
  };
  const nativeRuntime: NativeMicroFrontendRuntime = {
    evaluateScript: vi.fn(async () => undefined),
    startEventDelivery: vi.fn(),
    onEvent(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const onPreloadError = vi.fn<(error: unknown) => void>();
  const runtime = createMicroFrontendRuntimeWithDependencies({
    adapter,
    nativeRuntime,
    onPreloadError,
    afterPreloadApp: options.afterPreloadApp,
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
    onPreloadError,
    runtime,
  };
}

describe('createMicroFrontendRuntimeWithDependencies', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
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

  it('makes a new instance of an app from its definition without loading the bundle again', async () => {
    // Given: the bundle defines its container when native evaluates it (containerInit), then runs its first instance.
    const fixture = createRuntimeFixture();
    const run = (evaluation: { readonly evalId: string }) => {
      const container = createContainer('cart');
      exposeModule(container, './App', { default: () => evaluation.evalId });
    };
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      defineContainer({ appName: 'cart', evalId: 'e1', sourceUrl: '/bundles/cart.hbc' }, run);
      run({ evalId: 'e1' });
    });

    // When
    const first = await fixture.runtime.importApp<AppModule>('cart/App');
    const second = await fixture.runtime.instantiateApp<AppModule>('cart/App');
    const third = await fixture.runtime.instantiateApp<AppModule>('cart/App');

    // Then
    expect(first.default()).toBe('e1');
    expect([second.evalId, second.module.default()]).toEqual(['e1.1', 'e1.1']);
    expect([third.evalId, third.module.default()]).toEqual(['e1.2', 'e1.2']);
    expect(await fixture.runtime.importApp<AppModule>('cart/App')).toBe(first);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledOnce();
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledOnce();
    removeContainerDefinition('cart');
  });

  it('reuses a native view registered by the host when a remote bundle evaluates its wrapper', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const registeredViews = new Set<string>();
    const nativeComponentRegistry = {
      get(name: string) {
        if (registeredViews.has(name)) {
          throw new Error(`Tried to register two views with the same name ${name}`);
        }
        registeredViews.add(name);
        return name;
      },
    };
    nativeComponentRegistry.get('TossServiceWebView');
    getMicroFrontendGlobalContext().__SHARED__[NATIVE_COMPONENT_REGISTRY_MODULE] = {
      get: () => nativeComponentRegistry,
      loaded: true,
    };
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      const remoteRegistry = getMicroFrontendGlobalContext().__SHARED__[NATIVE_COMPONENT_REGISTRY_MODULE]?.get();
      const remoteGet =
        typeof remoteRegistry === 'object' && remoteRegistry != null ? Reflect.get(remoteRegistry, 'get') : undefined;
      if (typeof remoteGet !== 'function') {
        throw new Error('NativeComponentRegistry.get is unavailable');
      }
      Reflect.apply(remoteGet, remoteRegistry, ['TossServiceWebView', () => ({})]);
      createContainer('visit-mission');
    });

    // When / Then
    await expect(fixture.runtime.preloadApp('visit-mission')).resolves.toBeUndefined();
    expect(registeredViews).toEqual(new Set(['TossServiceWebView']));
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

  it('starts event delivery after registering the listener and forwards parsed native events', () => {
    // Given
    const fixture = createRuntimeFixture();
    const listener = vi.fn<(event: MicroFrontendSessionEvent) => void>();
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
    subscription.remove();
    fixture.emit(event);

    // Then
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
    expect(fixture.nativeRuntime.startEventDelivery).toHaveBeenCalledOnce();
  });

  it('handles native preload requests without forwarding them to session listeners', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const listener = vi.fn<(event: MicroFrontendSessionEvent) => void>();
    fixture.runtime.onEvent(listener);
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      createContainer('cart');
    });

    // When
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });

    // Then
    await vi.waitFor(() => {
      expect(fixture.adapter.loadBundle).toHaveBeenCalledWith({ appName: 'cart' });
    });
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledWith({
      filePath: '/bundles/cart.hbc',
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it('runs afterPreloadApp after every native preload request, also for an app evaluated before', async () => {
    // Given
    const afterPreloadApp = vi.fn<(appName: string) => void>();
    const fixture = createRuntimeFixture({ afterPreloadApp });
    fixture.runtime.onEvent(() => undefined);
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      createContainer('cart');
    });

    // When
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });
    await vi.waitFor(() => expect(afterPreloadApp).toHaveBeenCalledTimes(1));
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });

    // Then: the second request reuses the evaluation and still runs the hook.
    await vi.waitFor(() => expect(afterPreloadApp).toHaveBeenCalledTimes(2));
    expect(afterPreloadApp).toHaveBeenCalledWith('cart');
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledOnce();
  });

  it('does not run afterPreloadApp for imports, and reports its errors as preload errors', async () => {
    // Given
    const failure = new Error('hook failed');
    const afterPreloadApp = vi.fn(async () => {
      throw failure;
    });
    const fixture = createRuntimeFixture({ afterPreloadApp });
    fixture.runtime.onEvent(() => undefined);
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      exposeModule(createContainer('cart'), './App', { default: () => 'cart' });
    });

    // When
    await fixture.runtime.importApp('cart/App');
    expect(afterPreloadApp).not.toHaveBeenCalled();
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });

    // Then
    await vi.waitFor(() => expect(fixture.onPreloadError).toHaveBeenCalledWith(failure));
  });

  it('reports native preload failures without forwarding them to session listeners', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const listener = vi.fn<(event: MicroFrontendSessionEvent) => void>();
    fixture.runtime.onEvent(listener);
    const preloadError = new Error('bundle unavailable');
    fixture.adapter.loadBundle.mockRejectedValueOnce(preloadError);

    // When
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });

    // Then
    await vi.waitFor(() => {
      expect(fixture.onPreloadError).toHaveBeenCalledWith(preloadError);
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it('reuses the evaluated app after its last native session closes', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const firstModule: AppModule = { default: () => 'first cart' };
    fixture.runtime.onEvent(() => undefined);
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      const container = createContainer('cart');
      exposeModule(container, './App', firstModule);
      registerPendingHostComponentRoute('/products', {
        app: { host: 'app', name: 'cart', scheme: 'granite' },
        component: CartPendingComponent,
      });
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
    expect(microFrontendModuleRegistry.hasContainer('cart')).toBe(true);
    expect(microFrontendModuleRegistry.importModule('cart/App')).toBe(firstModule);
    expect(resolvePendingHostComponent('granite://app/cart/products')?.component).toBe(CartPendingComponent);
    fixture.emit({
      name: 'openApp',
      params: {
        appName: 'cart',
        scheme: 'granite://app/cart/products',
        sessionId: 'session-2',
      },
    });
    await expect(fixture.runtime.importApp<AppModule>('cart/App')).resolves.toBe(firstModule);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledOnce();
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledOnce();
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
