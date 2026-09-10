import type { MicroFrontendSessionEvent, MicroFrontendSessionState } from '../types';

export function createSessionStore() {
  let sessions: readonly MicroFrontendSessionState[] = Object.freeze([]);

  return {
    getSessions: () => sessions,
    applyEvent(event: MicroFrontendSessionEvent): boolean {
      const nextSessions = reduceSessions(sessions, event);
      if (nextSessions === sessions) {
        return false;
      }
      sessions = Object.freeze(nextSessions);
      return true;
    },
  };
}

function reduceSessions(
  sessions: readonly MicroFrontendSessionState[],
  event: MicroFrontendSessionEvent
): readonly MicroFrontendSessionState[] {
  const session = sessions.find(({ sessionId }) => sessionId === event.params.sessionId);
  switch (event.name) {
    case 'openApp':
      return session == null ? [...sessions, Object.freeze({ ...event.params, isVisible: false })] : sessions;
    case 'closeApp':
      return session == null ? sessions : sessions.filter(({ sessionId }) => sessionId !== event.params.sessionId);
    case 'sessionVisibilityChanged':
      return session == null || session.isVisible === event.params.isVisible
        ? sessions
        : sessions.map((current) =>
            current === session ? Object.freeze({ ...current, isVisible: event.params.isVisible }) : current
          );
    default: {
      const exhaustiveEvent: never = event;
      return exhaustiveEvent;
    }
  }
}
