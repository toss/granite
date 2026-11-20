import { render } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { AppRegistry } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import type { InitialProps } from '../initial-props';
import type { RequireContext } from '../router';
import { Granite } from './Granite';

const visibilityState = vi.hoisted<{ value: boolean | null }>(() => ({ value: null }));

vi.mock('./AppRoot', async () => {
  const { VisibilityChangedProvider, useVisibilityChanged } = await import('../visibility/useVisibilityChanged');

  function Consumer() {
    visibilityState.value = useVisibilityChanged();
    return null;
  }

  return {
    AppRoot: () => (
      <VisibilityChangedProvider isVisible={true}>
        <Consumer />
      </VisibilityChangedProvider>
    ),
  };
});

vi.mock('./HostAppRoot', () => ({
  HostAppRoot: () => null,
}));

vi.mock('@granite-js/brownfield-module', () => ({
  GraniteBrownfieldModule: {
    onVisibilityChanged: () => ({ remove: () => undefined }),
  },
}));

vi.mock('../constant-bridges', () => ({
  getSchemeUri: () => 'granite://visibility-runtime-test',
}));

vi.mock('../polyfills', () => ({
  setupPolyfills: () => undefined,
}));

const context: RequireContext = Object.assign(
  <T,>(id: string): T => {
    throw new Error(`The route context is not used by this test: ${id}`);
  },
  {
    id: 'visibility-runtime-test',
    keys: () => [],
    resolve: (id: string) => id,
  }
);

describe('Granite.registerApp', () => {
  it('installs presentation visibility inside the registered remote app root', () => {
    // Given
    function AppContainer({ children }: PropsWithChildren<InitialProps>) {
      return children;
    }
    const Root = Granite.registerApp(AppContainer, {
      appName: 'visibility-runtime-test',
      context,
    });

    // When
    render(<Root platform="android" initialColorPreference="light" presentationVisibility={false} />);

    // Then
    expect(visibilityState.value).toBe(false);
  });

  it('keeps the first AppRegistry registration and returns each call its own app for an app name registered again', () => {
    // Given
    const registerComponent = vi.spyOn(AppRegistry, 'registerComponent');
    function containerOf() {
      return function AppContainer({ children }: PropsWithChildren<InitialProps>) {
        return children;
      };
    }
    const appName = 'registered-twice-test';

    // When
    const First = Granite.registerApp(containerOf(), { appName, context });
    const Second = Granite.registerApp(containerOf(), { appName, context });

    // Then
    expect(registerComponent.mock.calls.filter(([key]) => key === appName)).toHaveLength(1);
    expect(Second).not.toBe(First);
    expect(AppRegistry.getAppKeys()).toContain(appName);
    registerComponent.mockRestore();
  });
});
