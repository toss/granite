import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getIsHostSkeletonHidden,
  hideHostSkeleton,
  registerHostSkeletonRoute,
  resetHostSkeleton,
  resetHostSkeletonStoreForTest,
  resolveHostSkeleton,
  resolveHostSkeletonForAppUrl,
} from './hostSkeletonStore';

function ProductSkeleton(): ReactNode {
  return null;
}

function FallbackSkeleton(): ReactNode {
  return null;
}

function DynamicProductSkeleton(): ReactNode {
  return null;
}

const shoppingApp = {
  name: 'shopping',
  scheme: 'example',
  host: 'app',
} as const;

describe('host skeleton registry', () => {
  beforeEach(() => {
    resetHostSkeletonStoreForTest();
  });

  it('resolves an app route and parses query params from its Granite URL', () => {
    registerHostSkeletonRoute('/product', {
      component: ProductSkeleton,
      app: shoppingApp,
    });

    const resolved = resolveHostSkeleton(
      'example://app/shopping/product?thumbnailUrl=https%3A%2F%2Fstatic.example.com%2Fimage.png&count=1&enabled=true'
    );

    expect(resolved?.component).toBe(ProductSkeleton);
    expect(resolved).toMatchObject({
      params: {
        thumbnailUrl: 'https://static.example.com/image.png',
        count: 1,
        enabled: true,
      },
      routePath: '/product',
      appName: 'shopping',
    });
  });

  it('merges dynamic path params before validating the skeleton params', () => {
    registerHostSkeletonRoute('/product/:id', {
      component: DynamicProductSkeleton,
      app: shoppingApp,
      validateParams: params => {
        const id = params == null || !('id' in params) ? '' : String(params.id);
        const tab = params == null || !('tab' in params) ? 'detail' : String(params.tab);

        return { id, tab };
      },
    });

    const resolved = resolveHostSkeleton('example://app/shopping/product/123?tab=review');

    expect(resolved?.params).toEqual({
      id: '123',
      tab: 'review',
    });
  });

  it('prefers an app-specific skeleton over a fallback skeleton', () => {
    registerHostSkeletonRoute('/product', {
      component: FallbackSkeleton,
    });
    registerHostSkeletonRoute('/product', {
      component: ProductSkeleton,
      appName: 'shopping',
    });

    expect(resolveHostSkeleton({ appName: 'shopping', routePath: '/product' })?.component).toBe(ProductSkeleton);
    expect(resolveHostSkeleton({ appName: 'benefit', routePath: '/product' })?.component).toBe(FallbackSkeleton);
  });

  it('resolves a fallback skeleton from an app URL when the remote registered before its app config', () => {
    registerHostSkeletonRoute('/product', {
      component: ProductSkeleton,
    });
    registerHostSkeletonRoute('/product', {
      component: FallbackSkeleton,
      app: {
        name: 'shared',
        scheme: 'supertoss',
        host: 'm',
      },
    });

    const resolved = resolveHostSkeletonForAppUrl(
      'shopping',
      'supertoss://m/shopping/product?thumbnailUrl=https%3A%2F%2Fstatic.example.com%2Fimage.png'
    );

    expect(resolved?.component).toBe(ProductSkeleton);
    expect(resolved).toMatchObject({
      params: {
        thumbnailUrl: 'https://static.example.com/image.png',
      },
      routePath: '/product',
    });
  });

  it('shares visibility state across host and remote package instances', () => {
    expect(getIsHostSkeletonHidden()).toBe(false);

    hideHostSkeleton();

    expect(getIsHostSkeletonHidden()).toBe(true);

    resetHostSkeleton();

    expect(getIsHostSkeletonHidden()).toBe(false);
  });
});
