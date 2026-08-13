import { VisibilityChangedProvider, useVisibilityChanged } from '@granite-js/react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import {
  MicroFrontendSessionProvider,
  type MicroFrontendSession,
  useMicroFrontendSession,
} from './MicroFrontendSessionContext';

vi.mock('@granite-js/react-native', () =>
  import('../../../react-native/src/visibility/useVisibilityChanged')
);

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

describe('MicroFrontendSessionProvider', () => {
  it('provides the native session identity', async () => {
    // Given
    let receivedSession: MicroFrontendSession | null = null;

    function Consumer() {
      receivedSession = useMicroFrontendSession();
      return null;
    }

    // When
    await act(async () => {
      create(
        <MicroFrontendSessionProvider presentationVisibility={true} sessionId="session-1">
          <Consumer />
        </MicroFrontendSessionProvider>
      );
    });

    // Then
    expect(receivedSession).toEqual({
      sessionId: 'session-1',
    });
  });

  it('combines native session visibility with the existing Granite visibility context', async () => {
    // Given
    let receivedVisibility: boolean | null = null;

    function Consumer() {
      receivedVisibility = useVisibilityChanged();
      return null;
    }

    // When
    await act(async () => {
      create(
        <MicroFrontendSessionProvider presentationVisibility={false} sessionId="session-1">
          <VisibilityChangedProvider isVisible={true}>
            <Consumer />
          </VisibilityChangedProvider>
        </MicroFrontendSessionProvider>
      );
    });

    // Then
    expect(receivedVisibility).toBe(false);
  });
});
