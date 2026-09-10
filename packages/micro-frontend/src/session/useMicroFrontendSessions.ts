import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { installPendingHostComponentBridge, resetPendingHostComponent } from '../host/pendingHostComponentStore';
import { emitMicroFrontendLifecycleEvent } from '../runtime/lifecycle';
import { disposeAppResources } from '../runtime/registry';
import type {
  MicroFrontendLifecycleEvent,
  MicroFrontendLifecycleSession,
  MicroFrontendRuntimeApi,
  MicroFrontendSessionState,
} from '../types';

export type { MicroFrontendSessionState } from '../types';

const INITIAL_SESSIONS: readonly MicroFrontendSessionState[] = [];

export function useMicroFrontendSessions(
  runtime: Pick<MicroFrontendRuntimeApi, 'onEvent' | 'getSessions' | 'onSessionsChanged'>
): readonly MicroFrontendSessionState[] {
  const subscribe = useCallback((listener: () => void) => runtime.onSessionsChanged(listener).remove, [runtime]);
  const sessions = useSyncExternalStore(subscribe, runtime.getSessions);
  const previousSessionsRef = useRef(INITIAL_SESSIONS);

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
