import { createRoute, getRouteScreens, useBackHandler } from '@granite-js/router';
import { act, render, cleanup } from '@testing-library/react';
import { AppState, Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '../visibility/useIsAppForeground';
import { VisibilityChangedProvider } from '../visibility/useVisibilityChanged';
import { Router, createRoute as legacyCreateRoute, useBackHandler as legacyUseBackHandler } from './index';

vi.mock('@granite-js/native/react-native-svg', () => ({ SvgXml: () => null }));
vi.mock('@granite-js/native/@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({ Navigator: () => null, Screen: () => null }),
}));

const state = vi.hoisted(() => ({ isActive: undefined as boolean | undefined }));
vi.mock('@granite-js/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@granite-js/router')>();
  return {
    ...actual,
    Router: ({ isActive }: { isActive?: boolean }) => {
      state.isActive = isActive;
      return null;
    },
  };
});
const context = Object.assign(() => ({ default: () => null }), {
  keys: () => [],
  resolve: (id: string) => id,
  id: 'adapter',
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Router host adapter', () => {
  it('shares route definitions and back hooks with the standalone package', () => {
    expect(legacyCreateRoute).toBe(createRoute);
    expect(legacyUseBackHandler).toBe(useBackHandler);
    const component = () => null;
    const Route = legacyCreateRoute('/legacy-entry', { component });
    const routeContext = Object.assign(() => ({ Route }), {
      keys: () => ['./legacy-entry.tsx'],
      resolve: (id: string) => id,
      id: 'legacy',
    });
    expect(getRouteScreens(routeContext)[0]?.component).toBe(component);
  });

  it('leaves activity detection to Router outside a registered app', () => {
    render(<Router context={context} prefix="example://app" />);
    expect(state.isActive).toBeUndefined();
  });

  it('propagates host visibility updates and never overrides a hidden host with isActive', () => {
    vi.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
    const view = render(
      <VisibilityChangedProvider isVisible={false}>
        <Router context={context} prefix="example://app" isActive={true} />
      </VisibilityChangedProvider>
    );
    expect(state.isActive).toBe(false);
    view.rerender(
      <VisibilityChangedProvider isVisible={true}>
        <Router context={context} prefix="example://app" />
      </VisibilityChangedProvider>
    );
    expect(state.isActive).toBe(true);
  });
  it.each(['ios', 'android'] as const)('preserves host foreground semantics on %s', (platform) => {
    vi.spyOn(Platform, 'OS', 'get').mockReturnValue(platform);
    render(
      <AppStateProvider>
        <VisibilityChangedProvider isVisible={true}>
          <Router context={context} prefix="example://app" />
        </VisibilityChangedProvider>
      </AppStateProvider>
    );
    const listener = vi.mocked(AppState.addEventListener).mock.calls.at(-1)![1];
    act(() => listener('background'));
    expect(state.isActive).toBe(platform === 'android');
    act(() => listener('active'));
    expect(state.isActive).toBe(true);
  });
});
