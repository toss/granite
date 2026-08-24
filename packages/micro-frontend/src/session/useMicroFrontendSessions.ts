import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { installPendingHostComponentBridge, resetPendingHostComponent } from '../host/pendingHostComponentStore';
import { emitMicroFrontendLifecycleEvent } from '../runtime/lifecycle';
import { disposeAppResources } from '../runtime/registry';
import type {
  MicroFrontendLifecycleEvent,
  MicroFrontendLifecycleSession,
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
        session.sessionId === event.params.sessionId ? { ...session, isVisible: event.params.isVisible } : session
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
  const [sessions, dispatch] = useReducer(reduceMicroFrontendSessions, INITIAL_SESSIONS);
  const previousSessionsRef = useRef(sessions);

  useEffect(() => {
    const previousSessions = previousSessionsRef.current;
    previousSessionsRef.current = sessions;
    const activeSessionIds = new Set(sessions.map(({ sessionId }) => sessionId));
    const activeAppNames = new Set(sessions.map(({ appName }) => appName));
    const mountedSessions = sessions.filter(
      ({ sessionId }) => !previousSessions.some((previousSession) => previousSession.sessionId === sessionId)
    );
    const inactiveSessions = previousSessions.filter(({ sessionId }) => !activeSessionIds.has(sessionId));
    const inactiveAppNames = new Set(
      inactiveSessions.map(({ appName }) => appName).filter((appName) => !activeAppNames.has(appName))
    );

    mountedSessions.forEach((session) => {
      emitMicroFrontendLifecycleEvent(runtime, createLifecycleEvent('mounted', session, sessions));
    });

    const appDisposals = new Map<string, Promise<void>>(
      Array.from(
        inactiveAppNames,
        (appName) =>
          [
            appName,
            disposeAppResources(appName).catch((error) => {
              console.error(`Failed to dispose micro-frontend app resources for '${appName}'`, error);
            }),
          ] as const
      )
    );

    inactiveSessions.forEach((session) => {
      const appDisposal = appDisposals.get(session.appName);
      if (appDisposal == null) {
        emitMicroFrontendLifecycleEvent(runtime, createLifecycleEvent('unmounted', session, sessions));
        return;
      }

      void appDisposal.then(() => {
        emitMicroFrontendLifecycleEvent(
          runtime,
          createLifecycleEvent('unmounted', session, previousSessionsRef.current)
        );
      });
    });
  }, [runtime, sessions]);

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

function createLifecycleEvent(
  phase: MicroFrontendLifecycleEvent['phase'],
  session: MicroFrontendSessionState,
  activeSessions: readonly MicroFrontendSessionState[]
): MicroFrontendLifecycleEvent {
  return {
    phase,
    session: toLifecycleSession(session),
    activeSessions: activeSessions.map(toLifecycleSession),
  };
}

function toLifecycleSession(session: MicroFrontendSessionState): MicroFrontendLifecycleSession {
  return {
    appName: session.appName,
    id: session.sessionId,
  };
}
