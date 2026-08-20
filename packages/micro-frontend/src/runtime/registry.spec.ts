import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContainer,
  disposeAppResources,
  exposeModule,
  getMicroFrontendRuntimeContext,
  hasContainer,
  removeContainer,
} from './registry';

describe('micro-frontend module registry', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
  });

  it('clears exposed modules before removing an app container', () => {
    // Given
    const container = createContainer('cart');
    exposeModule(container, './App', { default: () => 'cart' });

    // When
    removeContainer('cart');

    // Then
    expect(hasContainer('cart')).toBe(false);
    expect(container.exposedModules).toEqual({});
  });

  it('runs app session callbacks without removing the evaluated app resources', async () => {
    // Given
    const context = getMicroFrontendRuntimeContext();
    const container = createContainer('cart');
    exposeModule(container, './App', { default: () => 'cart' });
    const calls: string[] = [];
    context.dispose('cart', () => {
      calls.push('cart:first');
    });
    context.dispose('cart', async () => {
      calls.push('cart:second');
    });
    const catalogDispose = vi.fn();
    context.dispose('catalog', catalogDispose);

    // When
    await disposeAppResources('cart');
    await disposeAppResources('cart');

    // Then
    expect(calls).toEqual(['cart:second', 'cart:first', 'cart:second', 'cart:first']);
    expect(catalogDispose).not.toHaveBeenCalled();
    expect(hasContainer('cart')).toBe(true);
    expect(container.exposedModules['./App']).toBeDefined();
    expect(context.disposeCallbacksByApp.cart).toBeDefined();
    expect(context.disposeCallbacksByApp.catalog?.has(catalogDispose)).toBe(true);
  });

  it('rejects an untransformed source-level dispose call', () => {
    const context = getMicroFrontendRuntimeContext();

    expect(() => context.dispose(() => undefined)).toThrow(
      'dispose() must be compiled with the microFrontend plugin'
    );
  });
});
