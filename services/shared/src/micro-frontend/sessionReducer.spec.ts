import type { InitialProps } from '@granite-js/react-native';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { describe, expect, it } from 'vitest';
import { reduceSessions, type Session } from './sessionReducer';

const App: LazyExoticComponent<ComponentType<InitialProps>> = lazy(async () => ({
  default: () => null,
}));

const session: Session = {
  sessionId: 'session-1',
  scheme: 'granite://counter',
  isVisible: false,
  App,
};

describe('reduceSessions', () => {
  it('adds an opened session once when the same event is delivered repeatedly', () => {
    const opened = reduceSessions([], { type: 'opened', session });
    const repeated = reduceSessions(opened, { type: 'opened', session });

    expect(repeated).toEqual([session]);
  });

  it('changes visibility only for the matching session', () => {
    const visible = reduceSessions([session], {
      type: 'visibilityChanged',
      sessionId: session.sessionId,
      isVisible: true,
    });

    expect(visible[0]?.isVisible).toBe(true);
  });

  it('removes the closed session', () => {
    const closed = reduceSessions([session], { type: 'closed', sessionId: session.sessionId });

    expect(closed).toEqual([]);
  });
});
