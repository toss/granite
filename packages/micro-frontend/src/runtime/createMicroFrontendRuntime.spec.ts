import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerPendingHostComponentRoute,
  removePendingHostComponentRoutes,
  resetPendingHostComponentStoreForTest,
  resolvePendingHostComponent,
} from '../host/pendingHostComponentStore';
import type { MicroFrontendSessionEvent } from '../types';
import { resetAppCopies } from './appInstances';
import { installContainerInit, type MicroFrontendContainer } from './containerInit';
import { defineContainer, removeContainerDefinition } from './containerInstances';
import {
  createMicroFrontendRuntimeWithDependencies,
  type NativeMicroFrontendRuntime,
  type NativeMicroFrontendRuntimeEvent,
} from './createMicroFrontendRuntime';
import { getMicroFrontendGlobalContext } from './globalContext';
import { resetInstanceIds, setInstanceIdFormat } from './instanceIds';
import { parseNativeRuntimeEvent } from './parseNativeRuntimeEvent';
import { createContainer, exposeModule, microFrontendModuleRegistry } from './registry';

const NATIVE_COMPONENT_REGISTRY_MODULE = 'react-native/Libraries/NativeComponent/NativeComponentRegistry';

interface AppModule {
  readonly default: () => string;
}

function CartPendingComponent() {
  return null;
}

function createRuntimeFixture(options: { instancePerSession?: boolean } = {}) {
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
    instancePerSession: () => options.instancePerSession === true,
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

/**
 * A cart bundle built with containerInit(), evaluated by native: the wrapper defines the container on the first
 * evaluation and initializes every instance. Each instance's App answers its instanceId.
 */
function createCartBundleFixture(options: { instancePerSession: boolean }) {
  resetInstanceIds();
  resetAppCopies();
  removeContainerDefinition('cart');
  const containers = new Map<string, MicroFrontendContainer>();
  let initializing: MicroFrontendContainer | undefined;
  installContainerInit(({ container }) => {
    containers.set(container.instanceId, container);
    initializing = container;
  });
  const initContainer = () => Reflect.get(getMicroFrontendGlobalContext(), 'initContainer') as (value: object) => void;
  const body = (evaluation: { readonly instanceId?: string; readonly instanceOf?: string }) => {
    if (evaluation.instanceOf == null) {
      defineContainer({ appName: 'cart', sourceUrl: '/bundles/cart.hbc' }, body);
    }
    initContainer()({ instanceId: evaluation.instanceId, appName: 'cart', sourceUrl: '/bundles/cart.hbc' });
    const instanceId = initializing?.instanceId;
    exposeModule(createContainer('cart'), './App', { default: () => instanceId ?? 'none' });
  };
  const fixture = createRuntimeFixture(options);
  vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementation(async () => body({}));
  return { ...fixture, containers };
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

  it('gives each session its own app instance with instancePerSession, and never hands one to another session', async () => {
    // Given: native evaluates the cart bundle once; the wrapper defines its container and initializes each instance.
    const fixture = createCartBundleFixture({ instancePerSession: true });
    const open = (sessionId: string) =>
      fixture.emit({ name: 'openApp', params: { appName: 'cart', scheme: 'granite://cart', sessionId } });
    fixture.runtime.onEvent(() => undefined);
    open('s1');
    open('s2');

    // When / Then: the first session takes the evaluation, and keeps it.
    const s1 = await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's1' });
    expect(s1.default()).toBe('cart@1');
    expect(await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's1' })).toBe(s1);

    // Another session gets a new instance from the definition, without loading the bundle again.
    const s2 = await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's2' });
    expect(s2.default()).toBe('cart@2');
    expect(fixture.adapter.loadBundle).toHaveBeenCalledOnce();
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledOnce();

    // A native preload leaves one instance no session has used yet, and the next session takes it.
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });
    await vi.waitFor(() => expect(fixture.containers.get('cart@3')?.owner()).toBeUndefined());
    expect(fixture.containers.has('cart@3')).toBe(true);
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });
    open('s3');
    expect((await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's3' })).default()).toBe('cart@3');
    expect(fixture.containers.has('cart@4')).toBe(false);

    // A closed session's instance never goes to another session.
    fixture.emit({ name: 'closeApp', params: { appName: 'cart', sessionId: 's2' } });
    open('s4');
    expect((await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's4' })).default()).toBe('cart@4');
    expect(fixture.containers.get('cart@2')?.owner()).toBe('s2');

    // Without a session, importApp returns the app's first instance.
    expect(await fixture.runtime.importApp<AppModule>('cart/App')).toBe(s1);
  });

  it('formats instance ids with what the adapter returned for the defining evaluation', async () => {
    const fixture = createCartBundleFixture({ instancePerSession: true });
    setInstanceIdFormat(({ appName, sequence, bundle }) => {
      const deploymentId = (bundle as { deploymentId?: string } | undefined)?.deploymentId ?? 'none';
      return `${appName}@${deploymentId}@${sequence}`;
    });
    vi.mocked(fixture.adapter.loadBundle).mockResolvedValue({
      filePath: '/bundles/cart.hbc',
      deploymentId: 'd-42',
    } as { filePath: string });
    fixture.runtime.onEvent(() => undefined);
    fixture.emit({ name: 'openApp', params: { appName: 'cart', scheme: 'granite://cart', sessionId: 's1' } });
    fixture.emit({ name: 'openApp', params: { appName: 'cart', scheme: 'granite://cart', sessionId: 's2' } });

    const s1 = await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's1' });
    const s2 = await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's2' });

    expect([s1.default(), s2.default()]).toEqual(['cart@d-42@1', 'cart@d-42@2']);
  });

  it('rejects a formatted instance id that is not new', async () => {
    const fixture = createCartBundleFixture({ instancePerSession: true });
    setInstanceIdFormat(({ appName }) => appName);
    fixture.runtime.onEvent(() => undefined);
    fixture.emit({ name: 'openApp', params: { appName: 'cart', scheme: 'granite://cart', sessionId: 's1' } });
    fixture.emit({ name: 'openApp', params: { appName: 'cart', scheme: 'granite://cart', sessionId: 's2' } });

    await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's1' });
    await expect(fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's2' })).rejects.toThrow(
      'formatInstanceId must return a new non-empty id'
    );
  });

  it('gives every session the first instance without instancePerSession', async () => {
    const fixture = createCartBundleFixture({ instancePerSession: false });
    fixture.runtime.onEvent(() => undefined);
    fixture.emit({ name: 'openApp', params: { appName: 'cart', scheme: 'granite://cart', sessionId: 's1' } });
    fixture.emit({ name: 'preloadApp', params: { appName: 'cart' } });

    const module = await fixture.runtime.importApp<AppModule>('cart/App', { sessionId: 's1' });
    expect(module.default()).toBe('cart@1');
    expect(fixture.containers.get('cart@1')?.owner()).toBeUndefined();
    expect(fixture.containers.size).toBe(1);
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
