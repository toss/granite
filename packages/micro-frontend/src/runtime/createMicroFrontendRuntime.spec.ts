import vm from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { virtualSharedConfig } from '../../../plugin-micro-frontend/src/resolver';
import {
  registerPendingHostComponentRoute,
  removePendingHostComponentRoutes,
  resetPendingHostComponentStoreForTest,
  resolvePendingHostComponent,
} from '../host/pendingHostComponentStore';
import type { MicroFrontendSessionEvent } from '../types';
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

async function getLegacySharedResolverContents(moduleName: string): Promise<string> {
  const config = virtualSharedConfig([[moduleName, {}]]);
  const load = config.protocols?.['virtual-shared']?.load;
  if (load == null) {
    throw new Error('Legacy shared resolver did not provide a loader');
  }
  const result = await load({
    path: moduleName,
    namespace: 'virtual-shared',
    suffix: '',
    pluginData: undefined,
    with: {},
  });
  if (typeof result.contents !== 'string') {
    throw new Error('Legacy shared resolver did not generate executable JavaScript');
  }
  return result.contents;
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
    Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
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

  it('bootstraps canonical compatibility before evaluateScript runs a legacy shared resolver synchronously', async () => {
    // Given
    const sharedValue = { version: '19' };
    const compatibilityContext = {
      containers: {},
      sharedModules: { react: { get: () => sharedValue, loaded: true } },
    };
    Reflect.set(globalThis, '_graniteMicroFrontend', compatibilityContext);
    const resolverContents = await getLegacySharedResolverContents('react');
    const fixture = createRuntimeFixture();
    const generatedModule = { exports: undefined };
    let keysObservedDuringEvaluation: readonly string[] = [];
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(() => {
      keysObservedDuringEvaluation = Object.keys(globalThis.__MICRO_FRONTEND__ ?? {});
      vm.runInNewContext(resolverContents, { global: globalThis, module: generatedModule });
      createContainer('legacy-shared-consumer');
      return Promise.resolve();
    });

    // When
    await fixture.runtime.preloadApp('legacy-shared-consumer');

    // Then
    expect(keysObservedDuringEvaluation).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(generatedModule.exports).toBe(sharedValue);
    expect(globalThis.__MICRO_FRONTEND__.__SHARED__).toBe(compatibilityContext.sharedModules);
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
