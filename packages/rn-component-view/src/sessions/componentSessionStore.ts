import type { RNComponentEvent, RNComponentSessionState } from '../types';

export function createComponentSessionStore() {
  let sessions: readonly RNComponentSessionState[] = Object.freeze([]);

  return {
    getSessions: () => sessions,
    applyEvent(event: RNComponentEvent): boolean {
      const nextSessions = reduceComponentSessions(sessions, event);
      if (nextSessions === sessions) {
        return false;
      }
      sessions = Object.freeze(nextSessions);
      return true;
    },
  };
}

function reduceComponentSessions(
  sessions: readonly RNComponentSessionState[],
  event: RNComponentEvent
): readonly RNComponentSessionState[] {
  const session = sessions.find(({ sessionId }) => sessionId === event.params.sessionId);
  switch (event.name) {
    case 'openComponent': {
      // The native module resends every open component when a renderer starts, so an open session is replaced.
      const openedSession = Object.freeze({ ...event.params });
      return session == null
        ? [...sessions, openedSession]
        : sessions.map((current) => (current === session ? openedSession : current));
    }
    case 'updateComponentProps':
      return session == null
        ? sessions
        : sessions.map((current) =>
            current === session ? Object.freeze({ ...current, props: event.params.props }) : current
          );
    case 'closeComponent':
      return session == null ? sessions : sessions.filter((current) => current !== session);
    default: {
      const exhaustiveEvent: never = event;
      return exhaustiveEvent;
    }
  }
}
