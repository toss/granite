import type { InitialProps } from '@granite-js/react-native';
import type { ComponentType, LazyExoticComponent } from 'react';

export interface Session {
  readonly sessionId: string;
  readonly scheme: string;
  readonly isVisible: boolean;
  readonly App: LazyExoticComponent<ComponentType<InitialProps>>;
}

export type SessionAction =
  | { readonly type: 'opened'; readonly session: Session }
  | { readonly type: 'closed'; readonly sessionId: string }
  | {
      readonly type: 'visibilityChanged';
      readonly sessionId: string;
      readonly isVisible: boolean;
    };

export function reduceSessions(sessions: readonly Session[], action: SessionAction): readonly Session[] {
  switch (action.type) {
    case 'opened':
      return sessions.some(({ sessionId }) => sessionId === action.session.sessionId)
        ? sessions
        : [...sessions, action.session];
    case 'closed':
      return sessions.filter(({ sessionId }) => sessionId !== action.sessionId);
    case 'visibilityChanged':
      return sessions.map((session) =>
        session.sessionId === action.sessionId ? { ...session, isVisible: action.isVisible } : session
      );
    default:
      action satisfies never;
      return sessions;
  }
}
