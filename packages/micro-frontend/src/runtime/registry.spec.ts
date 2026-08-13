import { beforeEach, describe, expect, it } from 'vitest';
import { createContainer, exposeModule, hasContainer, removeContainer } from './registry';

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
});
