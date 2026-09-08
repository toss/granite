import { describe, expect, it, vi } from 'vitest';
import { createMicroFrontendRuntime } from './createMicroFrontendRuntime';
import type { NativeMicroFrontendRuntimeEvent } from './runtime/createMicroFrontendRuntime';
import { emitMicroFrontendLifecycleEvent } from './runtime/lifecycle';
import type { MicroFrontendLifecycleEvent } from './types';

vi.mock('./specs/NativeGraniteMicroFrontendRuntime', () => ({
  default: {
    onEvent(listener: (event: NativeMicroFrontendRuntimeEvent) => void) {
      listener({ name: 'openApp', params: { sessionId: 'app-1:1', appName: 'app-1', scheme: 'granite://app-1/home' } });
      return { remove: () => undefined };
    },
    startEventDelivery: () => undefined,
  },
}));

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
    const subscription = runtime.onEvent(() => undefined);
    emitMicroFrontendLifecycleEvent(runtime, event);

    // Then
    expect(onLifecycleEvent).toHaveBeenCalledWith(event);
    subscription.remove();
  });
});
