import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type MicroFrontendSessionState,
  useMicroFrontendSessions,
} from './useMicroFrontendSessions';
import {
  getIsPendingHostComponentHidden,
  hidePendingHostComponent,
} from '../host/pendingHostComponentStore';
import { getMicroFrontendRuntimeContext } from '../runtime/registry';
import type {
  MicroFrontendRuntimeApi,
  MicroFrontendSessionEvent,
} from '../types';

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
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '_graniteMicroFrontend');
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

  it('runs retained app dispose callbacks when its last session closes', () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);
    const dispose = vi.fn();
    getMicroFrontendRuntimeContext().dispose('app-1', dispose);

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
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/2',
          sessionId: 'app-1:2',
        },
      });
    });
    act(() => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:2' } });
    });
    expect(dispose).not.toHaveBeenCalled();
    act(() => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:1' } });
    });
    act(() => {
      fixture.emit({
        name: 'openApp',
        params: {
          appName: 'app-1',
          scheme: 'granite://app-1/product/3',
          sessionId: 'app-1:3',
        },
      });
    });
    act(() => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:3' } });
    });

    // Then
    expect(dispose).toHaveBeenCalledTimes(2);
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
