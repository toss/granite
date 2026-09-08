import { BaseNavigationContainer, createNavigationContainerRef } from '@granite-js/native/@react-navigation/native';
import { render } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { InitialProps } from '../initial-props';
import type { RequireContext, RouterProps } from '../router';
import { Granite } from './Granite';

vi.mock('./AppRoot', () => ({
  AppRoot: ({ router }: { readonly router?: RouterProps }) => (
    <BaseNavigationContainer ref={router?.ref ?? router?.navigationContainerRef}>{null}</BaseNavigationContainer>
  ),
}));
vi.mock('./HostAppRoot', () => ({ HostAppRoot: () => null }));
vi.mock('../constant-bridges', () => ({ getSchemeUri: () => 'granite://example/home' }));
vi.mock('../polyfills', () => ({ setupPolyfills: () => undefined }));

const context: RequireContext = Object.assign(
  <T,>(id: string): T => {
    throw new Error(`Unused route: ${id}`);
  },
  { id: 'navigation-runtime', keys: () => [], resolve: (id: string) => id }
);
const Container = ({ children }: PropsWithChildren<InitialProps>) => children;

describe('registered app navigation ownership', () => {
  it('overrides both registration-time refs with each mounted instance ref', () => {
    // Given
    const shared = createNavigationContainerRef<never>();
    const alias = createNavigationContainerRef<never>();
    const one = createNavigationContainerRef<never>();
    const two = createNavigationContainerRef<never>();
    const App = Granite.registerApp(Container, {
      appName: 'navigation-runtime-scoped',
      context,
      router: { navigationContainerRef: shared, ref: alias },
    });

    // When
    const first = render(<App platform="android" initialColorPreference="light" navigationContainerRef={one} />);
    const second = render(<App platform="android" initialColorPreference="light" navigationContainerRef={two} />);
    const firstContainer = one.current;
    second.unmount();

    // Then
    expect(firstContainer).not.toBeNull();
    expect(one.current).toBe(firstContainer);
    expect(two.current).toBeNull();
    expect(shared.current).toBeNull();
    expect(alias.current).toBeNull();
    first.unmount();
  });

  it('preserves explicit router refs when no instance ref is supplied', () => {
    // Given
    const navigation = createNavigationContainerRef<never>();
    const App = Granite.registerApp(Container, {
      appName: 'navigation-runtime-standalone',
      context,
      router: { navigationContainerRef: navigation },
    });

    // When
    const rendered = render(<App platform="android" initialColorPreference="light" />);

    // Then
    expect(navigation.current).not.toBeNull();
    rendered.unmount();
  });
});
