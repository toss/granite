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
        host: 'app',
        name: 'shopping',
        scheme: 'legacy',
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__granite');
  });

  it('registers the host pending component once for the native scheme without a cross-app fallback', () => {
    reactNative.getSchemeUri.mockReturnValue('example://app/shopping/product/123?tab=review');

    createRoute('/product/:productId', {
      component: ProductPendingComponent,
      hostPendingComponent: ProductPendingComponent,
    });

    expect(reactNative.getSchemeUri).toHaveBeenCalledOnce();
    expect(resolvePendingHostComponent('example://app/shopping/product/123?tab=review')?.component).toBe(ProductPendingComponent);
    expect(resolvePendingHostComponent({ appName: 'benefit', routePath: '/product/123' })).toBeNull();
  });
});
