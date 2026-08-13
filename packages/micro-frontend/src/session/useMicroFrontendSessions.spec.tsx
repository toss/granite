import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import {
  getIsPendingHostComponentHidden,
  hidePendingHostComponent,
} from '../host/pendingHostComponentStore';
import type {
  MicroFrontendRuntimeApi,
  MicroFrontendSessionEvent,
} from '../types';
import {
  type MicroFrontendSessionState,
  useMicroFrontendSessions,
} from './useMicroFrontendSessions';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function createRuntimeFixture() {
  let listener: ((event: MicroFrontendSessionEvent) => void) | null = null;
  const remove = vi.fn();
  const runtime: Pick<MicroFrontendRuntimeApi, 'onEvent'> = {
    onEvent(nextListener) {
      listener = nextListener;
      return { remove };
    },
  };

  return {
    emit(event: MicroFrontendSessionEvent) {
      listener?.(event);
    },
    remove,
    runtime,
  };
}

function renderSessions(runtime: Pick<MicroFrontendRuntimeApi, 'onEvent'>) {
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
  it('adds an opened native session to React state', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);

    // When
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'shopping',
          scheme: 'supertoss://m/shopping/product/1',
          sessionId: 'shopping:1',
        },
      });
    });

    // Then
    expect(rendered.current).toEqual([
      {
        appName: 'shopping',
        sessionId: 'shopping:1',
        scheme: 'supertoss://m/shopping/product/1',
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
          appName: 'shopping',
          scheme: 'supertoss://m/shopping/product/1',
          sessionId: 'shopping:1',
        },
      });
    });

    // When
    act(() => {
      fixture.emit({
        name: 'sessionVisibilityChanged',
        params: { sessionId: 'shopping:1', isVisible: true },
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
          appName: 'shopping',
          scheme: 'supertoss://m/shopping/product/1',
          sessionId: 'shopping:1',
        },
      });
    });
    const originalSession = rendered.current[0];

    // When
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'shopping',
          scheme: 'supertoss://m/shopping/product/2',
          sessionId: 'shopping:1',
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
          appName: 'shopping',
          scheme: 'supertoss://m/shopping/product/1',
          sessionId: 'shopping:1',
        },
      });
    });

    // When
    act(() => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'shopping:1' } });
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
          appName: 'shopping',
          scheme: 'supertoss://m/shopping/product/1',
          sessionId: 'shopping:1',
        },
      });
    });

    // Then
    expect(getIsPendingHostComponentHidden()).toBe(false);
    rendered.unmount();
  });

  it('removes the runtime subscription when the host unmounts', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);

    // When
    rendered.unmount();

    // Then
    expect(fixture.remove).toHaveBeenCalledOnce();
  });
});
