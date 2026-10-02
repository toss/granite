import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoute } from './createRoute';
import { resetPendingHostComponentStoreForTest, resolvePendingHostComponent } from './host/pendingHostComponentStore';

const reactNative = vi.hoisted(() => ({
  createRoute: vi.fn(() => ({ route: true })),
  getSchemeUri: vi.fn<() => string>(),
  useNavigation: vi.fn(),
}));

vi.mock('@granite-js/react-native', () => reactNative);

declare module '@granite-js/react-native' {
  interface RegisterScreenInput {
    readonly '/product/:productId': { readonly productId: string };
  }
}

function ProductPendingComponent(): ReactNode {
  return null;
}

describe('createRoute', () => {
  beforeEach(() => {
    resetPendingHostComponentStoreForTest();
    reactNative.createRoute.mockClear();
    reactNative.getSchemeUri.mockReset();
    Reflect.set(globalThis, '__granite', {
      app: {
        host: 'host',
        name: 'app-1',
        scheme: 'granite',
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__granite');
  });

  it.each(['', 'other://host/app-2/product/456', 'granite://host/app-1/product/123?tab=review'])(
    'registers the host pending component from app configuration when the current URL is %j',
    (currentURL) => {
      // Given
      reactNative.getSchemeUri.mockReturnValue(currentURL);

      // When
      createRoute('/product/:productId', {
        component: ProductPendingComponent,
        hostPendingComponent: ProductPendingComponent,
      });

      // Then
      expect(reactNative.getSchemeUri).not.toHaveBeenCalled();
      expect(resolvePendingHostComponent('granite://host/app-1/product/123?tab=review')?.component).toBe(
        ProductPendingComponent
      );
      expect(resolvePendingHostComponent({ appName: 'app-2', routePath: '/product/123' })).toBeNull();
      expect(resolvePendingHostComponent('other://host/app-1/product/123')).toBeNull();
    }
  );

  it('still creates the route when the host app configuration is unavailable', () => {
    // Given
    Reflect.deleteProperty(globalThis, '__granite');
    reactNative.getSchemeUri.mockReturnValue('granite://host/app-1/product/123');

    // When
    const route = createRoute('/product/:productId', {
      component: ProductPendingComponent,
      hostPendingComponent: ProductPendingComponent,
    });

    // Then
    expect(route).toEqual({ route: true });
    expect(resolvePendingHostComponent('granite://host/app-1/product/123')).toBeNull();
  });
});
