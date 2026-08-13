import { useLayoutEffect, useReducer } from 'react';
import {
  installPendingHostComponentBridge,
  resetPendingHostComponent,
} from '../host/pendingHostComponentStore';
import type {
  MicroFrontendRuntimeApi,
  MicroFrontendSessionEvent,
} from '../types';

export interface MicroFrontendSessionState {
  readonly appName: string;
  readonly sessionId: string;
  readonly scheme: string;
  readonly isVisible: boolean;
}

const INITIAL_SESSIONS: readonly MicroFrontendSessionState[] = [];

function reduceMicroFrontendSessions(
  sessions: readonly MicroFrontendSessionState[],
  event: MicroFrontendSessionEvent
): readonly MicroFrontendSessionState[] {
  switch (event.name) {
    case 'openApp':
      return sessions.some(({ sessionId }) => sessionId === event.params.sessionId)
        ? sessions
        : [
            ...sessions,
            {
              appName: event.params.appName,
              sessionId: event.params.sessionId,
              scheme: event.params.scheme,
              isVisible: false,
            },
          ];
    case 'closeApp':
      return sessions.filter(({ sessionId }) => sessionId !== event.params.sessionId);
    case 'sessionVisibilityChanged':
      return sessions.map((session) =>
        session.sessionId === event.params.sessionId
          ? { ...session, isVisible: event.params.isVisible }
          : session
      );
    default: {
      const exhaustiveEvent: never = event;
      return exhaustiveEvent;
    }
  }
}

export function useMicroFrontendSessions(
  runtime: Pick<MicroFrontendRuntimeApi, 'onEvent'>
): readonly MicroFrontendSessionState[] {
  const [sessions, dispatch] = useReducer(
    reduceMicroFrontendSessions,
    INITIAL_SESSIONS
  );

  useLayoutEffect(() => {
    installPendingHostComponentBridge();
    const subscription = runtime.onEvent((event) => {
      if (event.name === 'openApp') {
        resetPendingHostComponent();
      }
      dispatch(event);
    });

    return () => subscription.remove();
  }, [runtime]);

  return sessions;
}
