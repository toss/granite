import { describe, expect, it, vi } from 'vitest';
import { createSessionStore } from '../session/sessionStore';
import type { MicroFrontendLifecycleEvent } from '../types';
import { emitMicroFrontendLifecycleEvent, setMicroFrontendSessionStore } from './lifecycle';

function subscribe(runtime: object, callback: (event: MicroFrontendLifecycleEvent) => void) {
  const store = createSessionStore();
  setMicroFrontendSessionStore(runtime, store);
  store.sessions.subscribe((session) => session.addListener('lifecycle', callback));
  store.open({ id: 'app-1:1', appName: 'app-1' });
}

describe('micro-frontend lifecycle callbacks', () => {
  it('notifies the callback configured for the runtime', () => {
    // Given
    const runtime = {};
    const callback = vi.fn();
    subscribe(runtime, callback);
    const event = createLifecycleEvent();

    // When
    emitMicroFrontendLifecycleEvent(runtime, event);

    // Then
    expect(callback).toHaveBeenCalledWith(event);
  });

  it('keeps callbacks scoped to their runtime', () => {
    // Given
    const firstRuntime = {};
    const secondRuntime = {};
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    subscribe(firstRuntime, firstCallback);
    subscribe(secondRuntime, secondCallback);
    const event = createLifecycleEvent();

    // When
    emitMicroFrontendLifecycleEvent(firstRuntime, event);

    // Then
    expect(firstCallback).toHaveBeenCalledWith(event);
    expect(secondCallback).not.toHaveBeenCalled();
  });

  it('isolates callback failures from the session lifecycle', () => {
    // Given
    const runtime = {};
    const error = new Error('logging failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    subscribe(runtime, () => {
      throw error;
    });
    const event = createLifecycleEvent();

    // When
    emitMicroFrontendLifecycleEvent(runtime, event);

    // Then
    expect(consoleError).toHaveBeenCalledWith('Failed to run a micro-frontend session callback', error);
    consoleError.mockRestore();
  });
});

function createLifecycleEvent(): MicroFrontendLifecycleEvent {
  return {
    phase: 'mounted',
    session: {
      appName: 'app-1',
      id: 'app-1:1',
    },
    activeSessions: [{ appName: 'app-1', id: 'app-1:1' }],
  };
}
