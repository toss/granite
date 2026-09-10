import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MicroFrontendSessionState, useMicroFrontendSessions } from './useMicroFrontendSessions';
import { createSessionRuntimeFixture as createRuntimeFixture } from '../../test/sessionRuntimeFixture';
import { getIsPendingHostComponentHidden, hidePendingHostComponent } from '../host/pendingHostComponentStore';
import type { MicroFrontendRuntimeApi } from '../types';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function renderSessions(runtime: MicroFrontendRuntimeApi) {
  let current: readonly MicroFrontendSessionState[] = [];

  function Consumer() {
    current = useMicroFrontendSessions(runtime);
    return null;
  }

  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(<Consumer />);
  });

  return {
    get current() {
      return current;
    },
    unmount() {
      act(() => renderer?.unmount());
    },
  };
}

describe('useMicroFrontendSessions', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  });

  it('adds an opened native session to React state', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);

    // When
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/1',
          sessionId: 'app-1:1',
        },
      });
    });

    // Then
    expect(rendered.current).toEqual([
      {
        appName: 'app-1',
        sessionId: 'app-1:1',
        scheme: 'granite://app-1/product/1',
        isVisible: false,
      },
    ]);
    rendered.unmount();
  });

  it('updates native presentation visibility for an opened session', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/1',
          sessionId: 'app-1:1',
        },
      });
    });

    // When
    act(() => {
      fixture.emit({
        name: 'sessionVisibilityChanged',
        params: { sessionId: 'app-1:1', isVisible: true },
      });
    });

    // Then
    expect(rendered.current[0]?.isVisible).toBe(true);
    rendered.unmount();
  });

  it('keeps the original session when native repeats an open event', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/1',
          sessionId: 'app-1:1',
        },
      });
    });
    const originalSession = rendered.current[0];

    // When
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/2',
          sessionId: 'app-1:1',
        },
      });
    });

    // Then
    expect(rendered.current).toHaveLength(1);
    expect(rendered.current[0]).toBe(originalSession);
    rendered.unmount();
  });

  it('removes a closed session from React state', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/1',
          sessionId: 'app-1:1',
        },
      });
    });

    // When
    act(() => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:1' } });
    });

    // Then
    expect(rendered.current).toEqual([]);
    rendered.unmount();
  });

  it('resets pending-host visibility when a new session opens', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);
    hidePendingHostComponent();

    // When
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/1',
          sessionId: 'app-1:1',
        },
      });
    });

    // Then
    expect(getIsPendingHostComponentHidden()).toBe(false);
    rendered.unmount();
  });

  it('removes the snapshot observer when the host unmounts while retaining native tracking', () => {
    // Given
    const fixture = createRuntimeFixture();
    const subscribe = fixture.runtime.onSessionsChanged;
    const remove = vi.fn();
    vi.spyOn(fixture.runtime, 'onSessionsChanged').mockImplementation((listener) => {
      const subscription = subscribe(listener);
      return {
        remove() {
          remove();
          subscription.remove();
        },
      };
    });
    const rendered = renderSessions(fixture.runtime);

    // When
    rendered.unmount();

    // Then
    expect(remove).toHaveBeenCalledOnce();
    expect(fixture.listenerCount).toBe(1);
  });

  it('renders the current snapshot when native sessions opened before the host mounted', () => {
    // Given
    const fixture = createRuntimeFixture();
    fixture.runtime.onEvent(() => undefined).remove();
    fixture.emit({
      name: 'openApp',
      params: { appName: 'catalog', sessionId: 'catalog:1', scheme: 'granite://catalog/products' },
    });
    fixture.emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'catalog:1', isVisible: true } });

    // When
    const rendered = renderSessions(fixture.runtime);

    // Then
    expect(rendered.current).toBe(fixture.runtime.getSessions());
    expect(rendered.current[0]?.isVisible).toBe(true);
    rendered.unmount();
  });
});
