import { NavigationIndependentTree } from '@granite-js/native/@react-navigation/native';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createNavigationRoot } from './createNavigationRoot';

vi.mock('@granite-js/native/@react-navigation/native', () => ({
  NavigationIndependentTree: vi.fn(({ children }: { readonly children: ReactNode }) => children),
}));

describe('createNavigationRoot', () => {
  it('keeps the navigation element unchanged by default', () => {
    // Given
    const navigation = createElement('navigation-root');

    // When
    const result = createNavigationRoot(navigation, false);

    // Then
    expect(result).toBe(navigation);
  });

  it('wraps the navigation element only when independence is explicitly enabled', () => {
    // Given
    const navigation = createElement('navigation-root');

    // When
    const result = createNavigationRoot(navigation, true);

    // Then
    expect(result).toMatchObject({
      type: NavigationIndependentTree,
      props: { children: navigation },
    });
  });
});
