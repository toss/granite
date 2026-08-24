import { describe, expect, it, vi } from 'vitest';
import type { MicroFrontendLifecycleEvent } from '../types';
import { emitMicroFrontendLifecycleEvent, setMicroFrontendLifecycleCallback } from './lifecycle';

describe('micro-frontend lifecycle callbacks', () => {
  it('notifies the callback configured for the runtime', () => {
    // Given
    const runtime = {};
    const callback = vi.fn();
    setMicroFrontendLifecycleCallback(runtime, callback);
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
    setMicroFrontendLifecycleCallback(firstRuntime, firstCallback);
    setMicroFrontendLifecycleCallback(secondRuntime, secondCallback);
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
    setMicroFrontendLifecycleCallback(runtime, () => {
      throw error;
    });
    const event = createLifecycleEvent();

    // When
    emitMicroFrontendLifecycleEvent(runtime, event);

    // Then
    expect(consoleError).toHaveBeenCalledWith('Failed to run a micro-frontend lifecycle callback', error);
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
