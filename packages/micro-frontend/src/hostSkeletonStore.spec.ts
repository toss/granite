import { beforeEach, describe, expect, it } from 'vitest';
import {
  getIsHostSkeletonHidden,
  hideHostSkeleton,
  registerHostSkeletonRoute,
  resetHostSkeleton,
  resetHostSkeletonStoreForTest,
  resolveHostSkeleton,
} from './hostSkeletonStore';

function Skeleton(_params: any) {
  return null;
}

function FallbackSkeleton(_params: any) {
  return null;
}

const shoppingApp = {
  name: 'shopping',
  scheme: 'example',
  host: 'app',
};

describe('host skeleton registry', () => {
  beforeEach(() => {
    resetHostSkeletonStoreForTest();
  });

  it('resolves app route skeleton params from a configured Granite URL prefix', () => {
    registerHostSkeletonRoute('/product', {
      component: Skeleton,
      app: shoppingApp,
    });

    const resolved = resolveHostSkeleton(
      'example://app/shopping/product?thumbnailUrl=https%3A%2F%2Fstatic.example.com%2Fimage.png&count=1&enabled=true'
    );

    expect(resolved?.component).toBe(Skeleton);
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

  it('matches dynamic route params before query params are validated', () => {
    registerHostSkeletonRoute('/product/:id', {
      component: Skeleton,
      app: shoppingApp,
      validateParams: params => {
        const record = params as { id: string; tab?: string };

        return {
          id: String(record.id),
          tab: record.tab ?? 'detail',
        };
      },
    });

    const resolved = resolveHostSkeleton('example://app/shopping/product/123?tab=review');

    expect(resolved?.params).toEqual({
      id: '123',
      tab: 'review',
    });
  });

  it('prefers service-specific skeletons over fallback skeletons', () => {
    registerHostSkeletonRoute('/product', {
      component: FallbackSkeleton,
    });
    registerHostSkeletonRoute('/product', {
      component: Skeleton,
      appName: 'shopping',
    });

    expect(resolveHostSkeleton({ appName: 'shopping', routePath: '/product' })?.component).toBe(Skeleton);
    expect(resolveHostSkeleton({ appName: 'benefit', routePath: '/product' })?.component).toBe(FallbackSkeleton);
  });

  it('stores host skeleton visibility globally', () => {
    expect(getIsHostSkeletonHidden()).toBe(false);

    hideHostSkeleton();

    expect(getIsHostSkeletonHidden()).toBe(true);

    resetHostSkeleton();

    expect(getIsHostSkeletonHidden()).toBe(false);
  });
});
