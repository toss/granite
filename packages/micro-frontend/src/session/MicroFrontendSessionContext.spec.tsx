import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import {
  MicroFrontendSessionProvider,
  type MicroFrontendSession,
  useMicroFrontendSession,
} from './MicroFrontendSessionContext';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

describe('MicroFrontendSessionProvider', () => {
  it('provides the native session identity and bound close action', async () => {
    // Given
    const close = vi.fn(async () => undefined);
    let receivedSession: MicroFrontendSession | null = null;

    function Consumer() {
      receivedSession = useMicroFrontendSession();
      return null;
    }

    // When
    await act(async () => {
      create(
        <MicroFrontendSessionProvider sessionId="session-1" close={close}>
          <Consumer />
        </MicroFrontendSessionProvider>
      );
    });

    // Then
    expect(receivedSession).toEqual({
      sessionId: 'session-1',
      close,
    });
  });
});
