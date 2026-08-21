import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIsPendingHostComponentHidden,
  hidePendingHostComponent,
  installPendingHostComponentBridge,
  registerPendingHostComponentRoute,
  removePendingHostComponentRoutes,
  resetPendingHostComponent,
  resetPendingHostComponentStoreForTest,
  resolvePendingHostComponent,
} from './pendingHostComponentStore';
import { getMicroFrontendGlobalContext, MicroFrontendGlobalContextCompatibilityError } from '../runtime/globalContext';

const PENDING_STORE_KEY = 'pendingHostComponentStore';

function ProductPendingComponent(): ReactNode {
  return null;
}

function DynamicProductPendingComponent(): ReactNode {
  return null;
}

function BenefitPendingComponent(): ReactNode {
  return null;
}

const appOne = {
  name: 'app-1',
  scheme: 'granite',
  host: 'host',
} as const;

describe('pending host component registry', () => {
  beforeEach(() => {
    resetPendingHostComponentStoreForTest();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'hideSharedPendingHostComponent');
    Reflect.deleteProperty(getMicroFrontendGlobalContext(), PENDING_STORE_KEY);
  });

  it('stores the registry only on the canonical non-enumerable context field', () => {
    // Given
    const context = getMicroFrontendGlobalContext();

    // When
    registerPendingHostComponentRoute('/product', { component: ProductPendingComponent, app: appOne });

    // Then
    const store = Reflect.get(context, PENDING_STORE_KEY);
    expect(store).toBeDefined();
    expect(Object.keys(context)).toEqual(['__INSTANCES__', '__SHARED__', '__CONTAINERS__']);
    expect(Reflect.getOwnPropertyDescriptor(context, PENDING_STORE_KEY)).toMatchObject({
      configurable: true,
      enumerable: false,
      value: store,
      writable: true,
    });
  });

  it('reuses the canonical store across separately evaluated package copies', async () => {
    // Given
    const context = getMicroFrontendGlobalContext();
    Reflect.deleteProperty(context, PENDING_STORE_KEY);
    vi.resetModules();
    const firstPackageCopy = await import('./pendingHostComponentStore');

    // When
    firstPackageCopy.registerPendingHostComponentRoute('/product', { component: ProductPendingComponent, app: appOne });
    const store = Reflect.get(context, PENDING_STORE_KEY);
    vi.resetModules();
    const secondPackageCopy = await import('./pendingHostComponentStore');

    // Then
    expect(store).toBeDefined();
    expect(secondPackageCopy.resolvePendingHostComponent({ appName: 'app-1', routePath: '/product' })?.component).toBe(
      ProductPendingComponent
    );
    expect(Reflect.get(context, PENDING_STORE_KEY)).toBe(store);
  });

  it('rejects a malformed canonical pending store', () => {
    // Given
    const context = getMicroFrontendGlobalContext();
    Reflect.defineProperty(context, PENDING_STORE_KEY, {
      configurable: true,
      enumerable: false,
      value: {},
      writable: true,
    });

    // When
    const getHidden = () => getIsPendingHostComponentHidden();

    // Then
    expect(getHidden).toThrow(MicroFrontendGlobalContextCompatibilityError);
  });

  it('rejects a false canonical pending store definition without installing a partial store', () => {
    // Given
    const context = getMicroFrontendGlobalContext();
    Reflect.deleteProperty(context, PENDING_STORE_KEY);
    const rejectingContext = new Proxy(context, {
      defineProperty(target, property, descriptor) {
        return property === PENDING_STORE_KEY ? false : Reflect.defineProperty(target, property, descriptor);
      },
    });
    Reflect.set(globalThis, '__MICRO_FRONTEND__', rejectingContext);

    // When
    const getHidden = () => getIsPendingHostComponentHidden();

    // Then
    expect(getHidden).toThrow(MicroFrontendGlobalContextCompatibilityError);
    expect(Reflect.has(context, PENDING_STORE_KEY)).toBe(false);
    Reflect.set(globalThis, '__MICRO_FRONTEND__', context);
  });

  it('resolves an app route and parses query params from its Granite URL', () => {
    registerPendingHostComponentRoute('/product', {
      component: ProductPendingComponent,
      app: appOne,
    });

    const resolved = resolvePendingHostComponent(
      'granite://host/app-1/product?thumbnailUrl=https%3A%2F%2Fstatic.example.com%2Fimage.png&count=1&enabled=true'
    );

    expect(resolved?.component).toBe(ProductPendingComponent);
    expect(resolved).toMatchObject({
      params: {
        thumbnailUrl: 'https://static.example.com/image.png',
        count: 1,
        enabled: true,
      },
      routePath: '/product',
      appName: 'app-1',
    });
  });

  it('merges dynamic path params before validating the pending component params', () => {
    registerPendingHostComponentRoute('/product/:id', {
      component: DynamicProductPendingComponent,
      app: appOne,
      validateParams: (params) => {
        const id = params == null || !('id' in params) ? '' : String(params.id);
        const tab = params == null || !('tab' in params) ? 'detail' : String(params.tab);

        return { id, tab };
      },
    });

    const resolved = resolvePendingHostComponent('granite://host/app-1/product/123?tab=review');

    expect(resolved?.params).toEqual({
      id: '123',
      tab: 'review',
    });
  });

  it('does not resolve a pending component registered for another app', () => {
    registerPendingHostComponentRoute('/product', {
      component: ProductPendingComponent,
      app: appOne,
    });

    expect(resolvePendingHostComponent({ appName: 'app-1', routePath: '/product' })?.component).toBe(
      ProductPendingComponent
    );
    expect(resolvePendingHostComponent({ appName: 'app-2', routePath: '/product' })).toBeNull();
  });

  it('removes only routes owned by the released app', () => {
    // Given
    registerPendingHostComponentRoute('/product', {
      component: ProductPendingComponent,
      app: appOne,
    });
    registerPendingHostComponentRoute('/coupon', {
      component: BenefitPendingComponent,
      app: { host: 'host', name: 'app-2', scheme: 'granite' },
    });

    // When
    removePendingHostComponentRoutes('app-1');

    // Then
    expect(resolvePendingHostComponent({ appName: 'app-1', routePath: '/product' })).toBeNull();
    expect(resolvePendingHostComponent({ appName: 'app-2', routePath: '/coupon' })?.component).toBe(
      BenefitPendingComponent
    );
  });

  it('shares visibility state across host and remote package instances', () => {
    expect(getIsPendingHostComponentHidden()).toBe(false);

    hidePendingHostComponent();

    expect(getIsPendingHostComponentHidden()).toBe(true);

    resetPendingHostComponent();

    expect(getIsPendingHostComponentHidden()).toBe(false);
  });

  it('calls the shared hide bridge during package migration', () => {
    const legacyHide = vi.fn();
    Reflect.set(globalThis, 'hideSharedPendingHostComponent', legacyHide);

    hidePendingHostComponent();

    expect(legacyHide).toHaveBeenCalledOnce();

    installPendingHostComponentBridge();

    expect(Reflect.get(globalThis, 'hideSharedPendingHostComponent')).toBe(hidePendingHostComponent);
  });
});
