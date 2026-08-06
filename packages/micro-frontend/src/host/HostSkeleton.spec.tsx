import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  hideHostSkeleton,
  registerHostSkeletonRoute,
  resetHostSkeletonStoreForTest,
} from './hostSkeletonStore';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

interface ProductSkeletonParams {
  readonly count: number;
}

function ProductSkeleton({ count }: ProductSkeletonParams) {
  return createElement('ProductSkeleton', { count });
}

describe('HostSkeleton', () => {
  beforeEach(() => {
    resetHostSkeletonStoreForTest();
  });

  it('renders route params and disappears when the remote app hides it', async () => {
    const { HostSkeleton } = await import('./HostSkeleton');
    registerHostSkeletonRoute('/product', {
      app: { name: 'shopping', scheme: 'example', host: 'app' },
      component: ProductSkeleton,
    });
    const result: { renderer: ReactTestRenderer | null } = { renderer: null };

    await act(async () => {
      result.renderer = create(<HostSkeleton url="example://app/shopping/product?count=2" />);
    });

    const renderer = result.renderer;
    if (renderer == null) {
      throw new Error('HostSkeleton renderer was not created');
    }

    expect(renderer.root.findByType(ProductSkeleton).props.count).toBe(2);

    await act(async () => {
      hideHostSkeleton();
    });

    expect(renderer.toJSON()).toBeNull();
  });
});
