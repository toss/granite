import { describe, expect, it, vi } from 'vitest';
import { createSessionStore } from './sessionStore';

describe('session subscriptions', () => {
  it('keeps separate navigation handles for two instances of the same app', () => {
    // Given
    const store = createSessionStore();
    const received: string[] = [];
    store.sessions.subscribe((session) => {
      received.push(session.id);
    });

    // When
    store.open({ id: 'one', appName: 'example' });
    store.open({ id: 'two', appName: 'example' });

    // Then
    expect(received).toEqual(['one', 'two']);
    expect(store.sessions.get('one')?.navigation).not.toBe(store.sessions.get('two')?.navigation);
  });

  it('discovers existing sessions without replaying lifecycle transitions', () => {
    // Given
    const store = createSessionStore();
    store.open({ id: 'one', appName: 'example' });
    store.emit({ phase: 'mounted', session: { id: 'one', appName: 'example' }, activeSessions: [] });
    const lifecycle = vi.fn();
    const received: string[] = [];

    // When
    store.sessions.subscribe((session) => {
      received.push(session.id);
      return session.addListener('lifecycle', lifecycle);
    });

    // Then
    expect(received).toEqual(['one']);
    expect(lifecycle).not.toHaveBeenCalled();
  });

  it('cleans up only the closed session after its lifecycle event', () => {
    // Given
    const store = createSessionStore();
    const events: string[] = [];
    store.sessions.subscribe((session) => {
      const remove = session.addListener('lifecycle', (event) => events.push(`${session.id}:${event.phase}`));
      return () => {
        events.push(`${session.id}:cleanup`);
        remove();
      };
    });
    store.open({ id: 'one', appName: 'example' });
    store.open({ id: 'two', appName: 'example' });

    // When
    store.emit({
      phase: 'unmounted',
      session: { id: 'two', appName: 'example' },
      activeSessions: [{ id: 'one', appName: 'example' }],
    });

    // Then
    expect(events).toEqual(['two:unmounted', 'two:cleanup']);
    expect(store.sessions.getSnapshot().map((session) => session.id)).toEqual(['one']);
  });

  it('stops one observer without closing sessions or notifying other observers', () => {
    // Given
    const store = createSessionStore();
    const cleanup = vi.fn();
    const lifecycle = vi.fn();
    const stop = store.sessions.subscribe(() => cleanup);
    store.sessions.subscribe((session) => session.addListener('lifecycle', lifecycle));
    store.open({ id: 'one', appName: 'example' });

    // When
    stop();
    stop();

    // Then
    expect(cleanup).toHaveBeenCalledOnce();
    expect(lifecycle).not.toHaveBeenCalled();
    expect(store.sessions.get('one')).toBeDefined();
  });

  it('keeps the original handle when an open event is repeated', () => {
    // Given
    const store = createSessionStore();
    const subscriber = vi.fn();
    store.sessions.subscribe(subscriber);
    store.open({ id: 'one', appName: 'example' });
    const original = store.sessions.get('one');

    // When
    store.open({ id: 'one', appName: 'example' });

    // Then
    expect(subscriber).toHaveBeenCalledOnce();
    expect(store.sessions.get('one')).toBe(original);
  });

  it('runs setup cleanup when a session closes inside its subscriber', () => {
    // Given
    const store = createSessionStore();
    const cleanup = vi.fn();
    store.sessions.subscribe((session) => {
      store.close(session.id);
      return cleanup;
    });

    // When
    store.open({ id: 'one', appName: 'example' });

    // Then
    expect(cleanup).toHaveBeenCalledOnce();
    expect(store.sessions.getSnapshot()).toEqual([]);
  });

  it('continues delivering and cleaning up when a subscriber throws', () => {
    // Given
    const store = createSessionStore();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const setupFailure = new Error('setup failure');
    const cleanupFailure = new Error('cleanup failure');
    const cleanup = vi.fn();
    store.sessions.subscribe(() => {
      throw setupFailure;
    });
    store.sessions.subscribe(() => () => {
      throw cleanupFailure;
    });
    store.sessions.subscribe(() => cleanup);

    // When
    store.open({ id: 'one', appName: 'example' });
    store.close('one');

    // Then
    expect(cleanup).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledTimes(2);
    expect(store.sessions.getSnapshot()).toEqual([]);
    log.mockRestore();
  });

  it('keeps the old handle detached when a later session is opened', () => {
    // Given
    const store = createSessionStore();
    store.open({ id: 'one', appName: 'example' });
    const original = store.sessions.get('one');
    store.close('one');

    // When
    store.open({ id: 'two', appName: 'example' });

    // Then
    expect(original?.navigation.current).toBeNull();
    expect(original?.navigation).not.toBe(store.sessions.get('two')?.navigation);
  });
});
