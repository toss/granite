import { describe, expect, it } from 'vitest';
import { createExecutionContext } from './context';
import { createExecutionSessions } from './sessions';

describe('execution session lifetimes', () => {
  it('preserves captured work when the same logical session receives a new Activity lifetime', () => {
    const sessions = createExecutionSessions();
    const context = createExecutionContext();
    const first = sessions.bind('session', 'activity:1');
    const delayed = context.run(first, () => context.snapshot().bind(() => context.capture()));
    sessions.release('session', first.id);
    const replacement = sessions.bind('session', 'activity:2');
    expect(delayed()).toBe(first);
    expect(sessions.get('session')).toBe(replacement);
    expect(Object.isFrozen(first)).toBe(true);
    expect(sessions.release('session', first.id)).toBe(false);
    expect(sessions.get('session')).toBe(replacement);
  });

  it('rejects lifetime ID reuse across closed and concurrent sessions', () => {
    const sessions = createExecutionSessions();
    sessions.bind('a', 'lifetime');
    expect(() => sessions.bind('b', 'lifetime')).toThrow('cannot be reused');
    sessions.release('a', 'lifetime');
    expect(() => sessions.bind('a', 'lifetime')).toThrow('cannot be reused');
  });

  it('notifies only the affected session and keeps repeat registration stable', () => {
    const sessions = createExecutionSessions();
    const observed: string[] = [];
    const unsubscribe = sessions.subscribe('a', () => observed.push(sessions.get('a')?.id ?? 'closed'));
    const first = sessions.bind('a', 'a:1');
    sessions.bind('b', 'b:1');
    expect(sessions.bind('a', 'a:1')).toBe(first);
    sessions.bind('a', 'a:2');
    expect(sessions.release('a', 'a:1')).toBe(false);
    sessions.release('a', 'a:2');
    unsubscribe();
    sessions.bind('a', 'a:3');
    expect(observed).toEqual(['a:1', 'a:2', 'closed']);
  });
});
