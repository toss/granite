import { describe, expect, it, vi } from 'vitest';
import { createMicroFrontendRuntime } from './createMicroFrontendRuntime';
import { emitMicroFrontendLifecycleEvent } from './runtime/lifecycle';
import type { MicroFrontendLifecycleEvent } from './types';

describe('createMicroFrontendRuntime', () => {
  it('connects the host lifecycle callback to the created runtime', () => {
    // Given
    const onLifecycleEvent = vi.fn();
    const runtime = createMicroFrontendRuntime({
      adapter: {
        loadBundle: vi.fn(),
      },
      onLifecycleEvent,
    });
    const event: MicroFrontendLifecycleEvent = {
      phase: 'mounted',
      session: {
        appName: 'app-1',
        id: 'app-1:1',
      },
      activeSessions: [{ appName: 'app-1', id: 'app-1:1' }],
    };

    // When
    emitMicroFrontendLifecycleEvent(runtime, event);

    // Then
    expect(onLifecycleEvent).toHaveBeenCalledWith(event);
  });
});
