import { lazy } from 'react';
import { describe, expect, it } from 'vitest';
import { reduceMicroFrontendSessions } from './session';

const SESSION = {
  sessionId: 'session-1',
  scheme: 'granite://showcase',
  isVisible: false,
  App: lazy(async () => ({ default: () => null })),
} as const;

describe('reduceMicroFrontendSessions', () => {
  it('opens, updates, and closes a session by native session id', () => {
    const opened = reduceMicroFrontendSessions([], { type: 'opened', session: SESSION });
    const visible = reduceMicroFrontendSessions(opened, {
      type: 'visibilityChanged',
      sessionId: SESSION.sessionId,
      isVisible: true,
    });
    const closed = reduceMicroFrontendSessions(visible, {
      type: 'closed',
      sessionId: SESSION.sessionId,
    });

    expect(visible).toEqual([{ ...SESSION, isVisible: true }]);
    expect(closed).toEqual([]);
  });

  it('ignores duplicate open events', () => {
    const sessions = [SESSION];

    expect(reduceMicroFrontendSessions(sessions, { type: 'opened', session: SESSION })).toBe(sessions);
  });
});
