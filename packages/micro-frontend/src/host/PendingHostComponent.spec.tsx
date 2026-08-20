import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  hidePendingHostComponent,
  registerPendingHostComponentRoute,
  resetPendingHostComponentStoreForTest,
} from './pendingHostComponentStore';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

interface ProductPendingComponentParams {
  readonly count: number;
}

function ProductPendingComponent({ count }: ProductPendingComponentParams) {
  return createElement('ProductPendingComponent', { count });
}

describe('PendingHostComponent', () => {
  beforeEach(() => {
    resetPendingHostComponentStoreForTest();
  });

  it('renders route params and disappears when the remote app hides it', async () => {
    const { PendingHostComponent } = await import('./PendingHostComponent');
    registerPendingHostComponentRoute('/product', {
      app: { name: 'app-1', scheme: 'granite', host: 'host' },
      component: ProductPendingComponent,
    });
    const result: { renderer: ReactTestRenderer | null } = { renderer: null };

    await act(async () => {
      result.renderer = create(<PendingHostComponent url="granite://host/app-1/product?count=2" />);
    });

    const renderer = result.renderer;
    if (renderer == null) {
      throw new Error('PendingHostComponent renderer was not created');
    }

    expect(renderer.root.findByType(ProductPendingComponent).props.count).toBe(2);

    await act(async () => {
      hidePendingHostComponent();
    });

    expect(renderer.toJSON()).toBeNull();
  });
});
