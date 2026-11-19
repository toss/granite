import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMicroFrontendSessions } from './useMicroFrontendSessions';
import { resetPendingHostComponentStoreForTest } from '../host/pendingHostComponentStore';
import {
  createMicroFrontendRuntimeWithDependencies,
  type NativeMicroFrontendRuntime,
  type NativeMicroFrontendRuntimeEvent,
} from '../runtime/createMicroFrontendRuntime';
import { parseNativeRuntimeEvent } from '../runtime/parseNativeRuntimeEvent';
import { microFrontendModuleRegistry } from '../runtime/registry';
import type { MicroFrontendRuntimeApi } from '../types';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function createFixture(order: string[], options: { readonly withSessionDidUnmount?: boolean } = {}) {
  const listeners = new Set<(event: NativeMicroFrontendRuntimeEvent) => void>();
  const sessionDidUnmount = vi.fn((sessionId: string) => {
    order.push(`native:${sessionId}`);
  });
  const nativeRuntime: NativeMicroFrontendRuntime = {
    evaluateScript: vi.fn(async () => undefined),
    startEventDelivery: vi.fn(),
    ...(options.withSessionDidUnmount === false ? {} : { sessionDidUnmount }),
    onEvent(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const runtime = createMicroFrontendRuntimeWithDependencies({
    adapter: { loadBundle: vi.fn(async ({ appName }) => ({ filePath: `/bundles/${appName}.hbc` })) },
    nativeRuntime,
    onPreloadError: vi.fn(),
    registry: microFrontendModuleRegistry,
    removePendingHostComponentRoutes: vi.fn(),
    parseEvent: parseNativeRuntimeEvent,
  });
  return {
    runtime,
    sessionDidUnmount,
    emit(event: NativeMicroFrontendRuntimeEvent) {
      listeners.forEach((listener) => listener(event));
    },
    open(appName: string, sessionId: string) {
      this.emit({ name: 'openApp', params: { appName, scheme: `granite://${appName}/home`, sessionId } });
    },
    close(sessionId: string) {
      this.emit({ name: 'closeApp', params: { sessionId } });
    },
  };
}

/** Renders each session's tree under the component that reads the sessions, as a host does. */
function renderHost(runtime: MicroFrontendRuntimeApi, order: string[]) {
  function SessionTree({ sessionId }: { readonly sessionId: string }) {
    useEffect(
      () => () => {
        order.push(`cleanup:${sessionId}`);
      },
      [sessionId]
    );
    return null;
  }
  function Host() {
    const sessions = useMicroFrontendSessions(runtime);
    return (
      <>
        {sessions.map(({ sessionId }) => (
          <SessionTree key={sessionId} sessionId={sessionId} />
        ))}
      </>
    );
  }
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(<Host />);
  });
  return { unmount: () => act(() => renderer?.unmount()) };
}

describe('useMicroFrontendSessions session unmount', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
    resetPendingHostComponentStoreForTest();
  });

  it('reports a closed session to native after its tree has run its cleanups', () => {
    // Given
    const order: string[] = [];
    const fixture = createFixture(order);
    renderHost(fixture.runtime, order);
    act(() => fixture.open('app-1', 'app-1:1'));
    act(() => fixture.open('app-1', 'app-1:2'));

    // When
    act(() => fixture.close('app-1:1'));

    // Then
    expect(order).toEqual(['cleanup:app-1:1', 'native:app-1:1']);
    expect(fixture.sessionDidUnmount).toHaveBeenCalledOnce();
  });

  it('reports each closed session once, even when several components read the sessions', () => {
    // Given
    const order: string[] = [];
    const fixture = createFixture(order);
    renderHost(fixture.runtime, order);
    renderHost(fixture.runtime, order);
    act(() => fixture.open('app-1', 'app-1:1'));

    // When
    act(() => fixture.close('app-1:1'));

    // Then
    expect(fixture.sessionDidUnmount).toHaveBeenCalledOnce();
    expect(fixture.sessionDidUnmount).toHaveBeenCalledWith('app-1:1');
  });

  it('does not report sessions that native has not closed', () => {
    // Given
    const order: string[] = [];
    const fixture = createFixture(order);
    const host = renderHost(fixture.runtime, order);
    act(() => fixture.open('app-1', 'app-1:1'));

    // When
    host.unmount();

    // Then
    expect(fixture.sessionDidUnmount).not.toHaveBeenCalled();
  });

  it('works with a native runtime that does not implement sessionDidUnmount', () => {
    // Given
    const order: string[] = [];
    const fixture = createFixture(order, { withSessionDidUnmount: false });
    renderHost(fixture.runtime, order);
    act(() => fixture.open('app-1', 'app-1:1'));

    // When
    act(() => fixture.close('app-1:1'));

    // Then
    expect(order).toEqual(['cleanup:app-1:1']);
  });
});
