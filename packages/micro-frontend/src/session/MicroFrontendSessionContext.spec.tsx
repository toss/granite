import { VisibilityChangedProvider, useVisibilityChanged } from '@granite-js/react-native';
import * as React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import {
  MicroFrontendSessionProvider,
  type MicroFrontendSession,
  useMicroFrontendSession,
} from './MicroFrontendSessionContext';
import { getExecutionSessions, SESSION_EXECUTION_TOKEN } from '../execution/sessions';

vi.mock('@granite-js/react-native', () => import('../../../react-native/src/visibility/useVisibilityChanged'));

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

describe('MicroFrontendSessionProvider', () => {
  it('updates private ownership for a replacement Activity without changing Provider props or public session data', async () => {
    const sessions = getExecutionSessions();
    const first = sessions.bind('ownership-session', 'ownership:1');
    let observed: unknown;
    let publicData: unknown;
    function Consumer() {
      const session = useMicroFrontendSession();
      observed = Reflect.get(session, SESSION_EXECUTION_TOKEN);
      publicData = JSON.parse(JSON.stringify(session));
      return null;
    }
    let renderer: ReturnType<typeof create> | undefined;
    try {
      await act(async () => {
        renderer = create(<MicroFrontendSessionProvider sessionId="ownership-session" presentationVisibility={true}><Consumer /></MicroFrontendSessionProvider>);
      });
      expect(observed).toBe(first);
      await act(async () => { sessions.bind('ownership-session', 'ownership:2'); });
      expect(observed).toBe(sessions.get('ownership-session'));
      expect(observed).not.toBe(first);
      expect(publicData).toEqual({ sessionId: 'ownership-session' });
      expect(sessions.release('ownership-session', first.id)).toBe(false);
    } finally {
      await act(async () => { renderer?.unmount(); });
      sessions.release('ownership-session', 'ownership:2');
    }
  });

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

  it('shares session context across package copies while preserving nearest-provider ownership', async () => {
    // React is shared by the host and remote; this package need not be a singleton.
    vi.doMock('react', () => React);
    vi.resetModules();
    const remote = await import('./MicroFrontendSessionContext');
    let sessions: string[] = [];
    function RemoteConsumer() {
      sessions.push(remote.useMicroFrontendSession().sessionId);
      return null;
    }
    function HostConsumer() {
      sessions.push(useMicroFrontendSession().sessionId);
      return null;
    }
    const tree = (id: string) => (
      <MicroFrontendSessionProvider presentationVisibility={true} sessionId={id}>
        <RemoteConsumer />
        <remote.MicroFrontendSessionProvider presentationVisibility={true} sessionId="nested">
          <HostConsumer />
        </remote.MicroFrontendSessionProvider>
        <RemoteConsumer />
      </MicroFrontendSessionProvider>
    );
    let renderer: ReturnType<typeof create> | undefined;
    try {
      await act(async () => {
        renderer = create(tree('outer'));
      });
      expect(sessions).toEqual(['outer', 'nested', 'outer']);
      sessions = [];
      await act(async () => {
        renderer!.update(tree('updated'));
      });
      expect(sessions).toEqual(['updated', 'nested', 'updated']);
    } finally {
      await act(async () => {
        renderer?.unmount();
      });
      vi.doUnmock('react');
    }
  });
});
