import { describe, expect, it } from 'vitest';
import { createComponentSessionStore } from './componentSessionStore';

const demoSession = {
  sessionId: 'component-1',
  componentName: 'Demo',
  props: { count: 1 },
  sizing: 'contentHeight',
} as const;

describe('createComponentSessionStore', () => {
  it('adds an opened component session', () => {
    // Given
    const store = createComponentSessionStore();

    // When
    const changed = store.applyEvent({ name: 'openComponent', params: demoSession });

    // Then
    expect(changed).toBe(true);
    expect(store.getSessions()).toEqual([demoSession]);
  });

  it('replaces an open session in place when it opens again', () => {
    // Given
    const store = createComponentSessionStore();
    store.applyEvent({ name: 'openComponent', params: demoSession });
    store.applyEvent({ name: 'openComponent', params: { ...demoSession, sessionId: 'component-2' } });

    // When
    store.applyEvent({ name: 'openComponent', params: { ...demoSession, props: { count: 2 } } });

    // Then
    expect(store.getSessions().map(({ sessionId, props }) => ({ sessionId, props }))).toEqual([
      { sessionId: 'component-1', props: { count: 2 } },
      { sessionId: 'component-2', props: { count: 1 } },
    ]);
  });

  it('replaces the props of an open session and ignores unknown sessions', () => {
    // Given
    const store = createComponentSessionStore();
    store.applyEvent({ name: 'openComponent', params: demoSession });

    // When
    const updated = store.applyEvent({
      name: 'updateComponentProps',
      params: { sessionId: 'component-1', props: { label: 'next' } },
    });
    const ignored = store.applyEvent({
      name: 'updateComponentProps',
      params: { sessionId: 'unknown', props: { label: 'ignored' } },
    });

    // Then
    expect(updated).toBe(true);
    expect(ignored).toBe(false);
    expect(store.getSessions()).toEqual([{ ...demoSession, props: { label: 'next' } }]);
  });

  it('removes a closed session and ignores unknown sessions', () => {
    // Given
    const store = createComponentSessionStore();
    store.applyEvent({ name: 'openComponent', params: demoSession });

    // When
    const ignored = store.applyEvent({ name: 'closeComponent', params: { sessionId: 'unknown' } });
    const closed = store.applyEvent({ name: 'closeComponent', params: { sessionId: 'component-1' } });

    // Then
    expect(ignored).toBe(false);
    expect(closed).toBe(true);
    expect(store.getSessions()).toEqual([]);
  });
});
