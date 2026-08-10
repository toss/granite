import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetHostSkeletonStoreForTest, resolveHostSkeleton } from './host/hostSkeletonStore';

const reactNative = vi.hoisted(() => ({
  createRoute: vi.fn(() => ({ route: true })),
  getSchemeUri: vi.fn<() => string>(),
  useNavigation: vi.fn(),
}));

vi.mock('@granite-js/react-native', () => reactNative);

import { createRoute } from './createRoute';

declare module '@granite-js/react-native' {
  interface RegisterScreenInput {
    readonly '/product/:productId': { readonly productId: string };
  }
}

function ProductSkeleton(): ReactNode {
  return null;
}

describe('createRoute', () => {
  beforeEach(() => {
    resetHostSkeletonStoreForTest();
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

  it('registers the skeleton once for the native scheme without a cross-app fallback', () => {
    reactNative.getSchemeUri.mockReturnValue('example://app/shopping/product/123?tab=review');

    createRoute('/product/:productId', {
      component: ProductSkeleton,
      skeletonComponent: ProductSkeleton,
    });

    expect(reactNative.getSchemeUri).toHaveBeenCalledOnce();
    expect(resolveHostSkeleton('example://app/shopping/product/123?tab=review')?.component).toBe(ProductSkeleton);
    expect(resolveHostSkeleton({ appName: 'benefit', routePath: '/product/123' })).toBeNull();
  });
});
