import {
  BaseNavigationContainer,
  createNavigatorFactory,
  StackRouter,
  useNavigationBuilder,
} from '@granite-js/native/@react-navigation/native';
import type { ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { createMicroFrontendRuntime } from '../createMicroFrontendRuntime';
import { useMicroFrontendSessions } from './useMicroFrontendSessions';
import type { NativeMicroFrontendRuntimeEvent } from '../runtime/createMicroFrontendRuntime';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const listeners = vi.hoisted(() => new Set<(event: NativeMicroFrontendRuntimeEvent) => void>());
vi.mock('../specs/NativeGraniteMicroFrontendRuntime', () => ({
  default: {
    evaluateScript: async () => undefined,
    startEventDelivery: () => undefined,
    onEvent: (listener: (event: NativeMicroFrontendRuntimeEvent) => void) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  },
}));

function TestNavigator({ children }: { readonly children: ReactNode }) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, { children });
  return <NavigationContent>{state.routes.map((route) => descriptors[route.key]?.render())}</NavigationContent>;
}

const Stack = createNavigatorFactory(TestNavigator)();
const Screen = () => null;

function createFixture() {
  listeners.clear();
  const onLifecycleEvent = vi.fn();
  const runtime = createMicroFrontendRuntime({
    adapter: { loadBundle: async () => ({ filePath: '/bundles/example.hbc' }) },
    onPreloadError: () => undefined,
    onLifecycleEvent,
  });
  function Host() {
    return useMicroFrontendSessions(runtime).map((session) => (
      <BaseNavigationContainer key={session.sessionId} ref={runtime.sessions.get(session.sessionId)?.navigation}>
        <Stack.Navigator>
          <Stack.Screen name="home" component={Screen} />
          <Stack.Screen name="detail" component={Screen} />
        </Stack.Navigator>
      </BaseNavigationContainer>
    ));
  }
  let renderer: ReactTestRenderer | undefined;
  return {
    runtime,
    onLifecycleEvent,
    mount: () =>
      act(async () => {
        renderer = create(<Host />);
      }),
    unmount: () => act(async () => renderer?.unmount()),
    open: (id: string) => {
      listeners.forEach((listener) =>
        listener({ name: 'openApp', params: { sessionId: id, appName: 'example', scheme: 'granite://example/home' } })
      );
    },
    close: (id: string) => {
      listeners.forEach((listener) => listener({ name: 'closeApp', params: { sessionId: id } }));
    },
  };
}

describe('session navigation integration', () => {
  it('keeps state, ready events and actions scoped to each mounted container', async () => {
    // Given
    const fixture = createFixture();
    const stateEvents: string[] = [];
    const readyEvents: string[] = [];
    const stop = fixture.runtime.sessions.subscribe((session) => {
      const state = session.navigation.addListener('state', () => stateEvents.push(session.id));
      const ready = session.navigation.addListener('ready', () => readyEvents.push(session.id));
      return () => {
        state();
        ready();
      };
    });
    await fixture.mount();
    await act(async () => {
      fixture.open('one');
      fixture.open('two');
    });
    const one = fixture.runtime.sessions.get('one');
    const two = fixture.runtime.sessions.get('two');
    expect(one?.navigation.isReady()).toBe(true);
    expect(two?.navigation.isReady()).toBe(true);
    expect(readyEvents).toEqual(['one', 'two']);
    stateEvents.length = 0;

    // When
    await act(async () => one?.navigation.navigate('detail'));

    // Then
    expect(stateEvents).toEqual(['one']);
    expect(one?.navigation.getCurrentRoute()?.name).toBe('detail');
    expect(two?.navigation.getCurrentRoute()?.name).toBe('home');
    stop();
    await fixture.unmount();
  });

  it('keeps the remaining container operational when another session closes', async () => {
    // Given
    const fixture = createFixture();
    const cleaned: string[] = [];
    const stop = fixture.runtime.sessions.subscribe((session) => () => {
      cleaned.push(session.id);
    });
    await fixture.mount();
    await act(async () => {
      fixture.open('one');
      fixture.open('two');
    });
    const one = fixture.runtime.sessions.get('one');
    const two = fixture.runtime.sessions.get('two');

    // When
    await act(async () => fixture.close('two'));
    await act(async () => one?.navigation.navigate('detail'));

    // Then
    expect(cleaned).toEqual(['two']);
    expect(two?.navigation.isReady()).toBe(false);
    expect(one?.navigation.getCurrentRoute()?.name).toBe('detail');
    expect(fixture.runtime.sessions.get('two')).toBeUndefined();
    stop();
    await fixture.unmount();
  });

  it('does not retain a session opened and closed before React commits', async () => {
    // Given
    const fixture = createFixture();
    const cleanup = vi.fn();
    const stop = fixture.runtime.sessions.subscribe(() => cleanup);
    await fixture.mount();

    // When
    await act(async () => {
      fixture.open('one');
      fixture.close('one');
    });

    // Then
    expect(cleanup).toHaveBeenCalledOnce();
    expect(fixture.runtime.sessions.getSnapshot()).toEqual([]);
    expect(fixture.onLifecycleEvent).not.toHaveBeenCalled();
    stop();
    await fixture.unmount();
  });

  it('preserves legacy lifecycle payloads while allowing independent subscribers', async () => {
    // Given
    const fixture = createFixture();
    const onLifecycle = vi.fn();
    const stop = fixture.runtime.sessions.subscribe((session) => session.addListener('lifecycle', onLifecycle));
    await fixture.mount();

    // When
    await act(async () => fixture.open('one'));
    await act(async () => fixture.close('one'));

    // Then
    expect(onLifecycle.mock.calls).toEqual(fixture.onLifecycleEvent.mock.calls);
    expect(onLifecycle.mock.calls.map(([event]) => event.phase)).toEqual(['mounted', 'unmounted']);
    expect(onLifecycle.mock.calls[1]?.[0].activeSessions).toEqual([]);
    stop();
    await fixture.unmount();
  });
});
