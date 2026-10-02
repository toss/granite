import { describe, expect, it, vi } from 'vitest';
import { createSessionRuntimeFixture } from '../../test/sessionRuntimeFixture';
import type { MicroFrontendSessionState } from '../types';

const firstOpen = {
  name: 'openApp',
  params: { appName: 'catalog', sessionId: 'catalog:1', scheme: 'granite://catalog/first' },
} as const;
const secondOpen = {
  name: 'openApp',
  params: { appName: 'catalog', sessionId: 'catalog:2', scheme: 'granite://catalog/second' },
} as const;

describe('runtime session snapshots', () => {
  it('reads without starting native delivery and receives queued events on first subscription', () => {
    // Given
    const { runtime, emit, nativeRuntime, listenerCount } = createSessionRuntimeFixture();
    emit(firstOpen);
    emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'catalog:1', isVisible: true } });
    expect(runtime.getSessions()).toEqual([]);
    expect(nativeRuntime.startEventDelivery).not.toHaveBeenCalled();
    expect(listenerCount).toBe(0);
    const changes = vi.fn();

    // When
    runtime.onSessionsChanged(changes);

    // Then
    expect(changes).toHaveBeenCalledTimes(2);
    expect(runtime.getSessions()).toEqual([{ ...firstOpen.params, isVisible: true }]);
    expect(changes).toHaveBeenLastCalledWith(runtime.getSessions());
  });

  it('updates the snapshot before either kind of observer reads it', () => {
    // Given
    const { runtime, emit } = createSessionRuntimeFixture();
    const observed: (readonly MicroFrontendSessionState[])[] = [];
    runtime.onEvent(() => observed.push(runtime.getSessions()));
    runtime.onSessionsChanged((sessions) => observed.push(sessions));

    // When
    emit(firstOpen);

    // Then
    expect(observed).toHaveLength(2);
    expect(observed[0]).toBe(runtime.getSessions());
    expect(observed[1]).toBe(runtime.getSessions());
    expect(runtime.getSessions()).toEqual([{ ...firstOpen.params, isVisible: false }]);
  });

  it('preserves opening order and distinguishes multiple sessions of the same app', () => {
    // Given
    const { runtime, emit } = createSessionRuntimeFixture();
    runtime.onSessionsChanged(() => undefined);
    emit(firstOpen);
    emit(secondOpen);
    const beforeVisibility = runtime.getSessions();

    // When
    emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'catalog:1', isVisible: true } });
    emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'catalog:2', isVisible: true } });

    // Then
    expect(runtime.getSessions()).toEqual([
      { ...firstOpen.params, isVisible: true },
      { ...secondOpen.params, isVisible: true },
    ]);
    expect(
      runtime
        .getSessions()
        .filter((session) => session.isVisible)
        .at(-1)?.scheme
    ).toBe(secondOpen.params.scheme);
    expect(beforeVisibility).toEqual([
      { ...firstOpen.params, isVisible: false },
      { ...secondOpen.params, isVisible: false },
    ]);
  });

  it('preserves snapshot identity and suppresses notifications for unchanged state', () => {
    // Given
    const { runtime, emit } = createSessionRuntimeFixture();
    const changes = vi.fn();
    runtime.onSessionsChanged(changes);
    emit(firstOpen);
    const snapshot = runtime.getSessions();
    changes.mockClear();

    // When
    emit(firstOpen);
    emit({ name: 'closeApp', params: { sessionId: 'unknown' } });
    emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'unknown', isVisible: true } });
    emit({ name: 'sessionVisibilityChanged', params: { sessionId: 'catalog:1', isVisible: false } });

    // Then
    expect(runtime.getSessions()).toBe(snapshot);
    expect(changes).not.toHaveBeenCalled();
  });

  it('keeps tracking between subscriptions and lets late observers read the current snapshot', () => {
    // Given
    const fixture = createSessionRuntimeFixture();
    const first = vi.fn();
    const subscription = fixture.runtime.onSessionsChanged(first);
    fixture.emit(firstOpen);
    subscription.remove();

    // When
    fixture.emit(secondOpen);
    fixture.emit({ name: 'closeApp', params: { sessionId: 'catalog:1' } });
    const late = vi.fn();
    fixture.runtime.onSessionsChanged(late);

    // Then
    expect(fixture.runtime.getSessions()).toEqual([{ ...secondOpen.params, isVisible: false }]);
    expect(first).toHaveBeenCalledOnce();
    expect(late).not.toHaveBeenCalled();
    expect(fixture.listenerCount).toBe(1);
    expect(fixture.nativeRuntime.startEventDelivery).toHaveBeenCalledOnce();
  });

  it('isolates an observer failure so session and event observers still receive the change', () => {
    // Given
    const { runtime, emit } = createSessionRuntimeFixture();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const changes = vi.fn();
    const events = vi.fn();
    runtime.onSessionsChanged(() => {
      throw new Error('observer failed');
    });
    runtime.onSessionsChanged(changes);
    runtime.onEvent(events);

    // When
    emit(firstOpen);

    // Then
    expect(changes).toHaveBeenCalledWith(runtime.getSessions());
    expect(events).toHaveBeenCalledWith(firstOpen);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('handles native preloads once without adding a session or notifying session observers', async () => {
    // Given
    const { runtime, emit, adapter } = createSessionRuntimeFixture();
    const changes = vi.fn();
    runtime.onSessionsChanged(changes);
    runtime.onEvent(() => undefined);
    const empty = runtime.getSessions();

    // When
    emit({ name: 'preloadApp', params: { appName: 'catalog' } });
    await runtime.preloadApp('catalog');

    // Then
    expect(adapter.loadBundle).toHaveBeenCalledOnce();
    expect(changes).not.toHaveBeenCalled();
    expect(runtime.getSessions()).toBe(empty);
  });

  it('removes duplicate registrations independently', () => {
    // Given
    const { runtime, emit } = createSessionRuntimeFixture();
    const changes = vi.fn();
    const events = vi.fn();
    const firstChanges = runtime.onSessionsChanged(changes);
    runtime.onSessionsChanged(changes);
    const firstEvents = runtime.onEvent(events);
    runtime.onEvent(events);
    emit(firstOpen);

    // When
    firstChanges.remove();
    firstEvents.remove();
    emit(secondOpen);

    // Then
    expect(changes).toHaveBeenCalledTimes(3);
    expect(events).toHaveBeenCalledTimes(3);
  });
});
