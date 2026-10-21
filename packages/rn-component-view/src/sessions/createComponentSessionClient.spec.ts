import { describe, expect, it, vi } from 'vitest';
import { createComponentSessionFixture } from '../../test/componentSessionFixture';
import type { RNComponentSessionState } from '../types';

const openDemo = {
  name: 'openComponent',
  params: { sessionId: 'component-1', componentName: 'Demo', props: { count: 1 }, sizing: 'contentHeight' },
} as const;

describe('createComponentSessionClient', () => {
  it('does not start native delivery until the sessions are observed', () => {
    // Given
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openDemo);

    // When
    const sessions = fixture.client.getSessions();

    // Then
    expect(sessions).toEqual([]);
    expect(fixture.nativeModule.startEventDelivery).not.toHaveBeenCalled();
  });

  it('receives components opened before delivery started and applies later events', () => {
    // Given
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openDemo);
    const snapshots: (readonly RNComponentSessionState[])[] = [];

    // When
    fixture.client.onSessionsChanged((sessions) => snapshots.push(sessions));
    fixture.client.onSessionsChanged(() => undefined);
    fixture.emitEvent({
      name: 'updateComponentProps',
      params: { sessionId: 'component-1', props: { count: 2 } },
    });
    fixture.emitEvent({ name: 'closeComponent', params: { sessionId: 'component-1' } });

    // Then
    expect(fixture.nativeModule.startEventDelivery).toHaveBeenCalledOnce();
    expect(snapshots).toEqual([
      [{ sessionId: 'component-1', componentName: 'Demo', props: { count: 1 }, sizing: 'contentHeight' }],
      [{ sessionId: 'component-1', componentName: 'Demo', props: { count: 2 }, sizing: 'contentHeight' }],
      [],
    ]);
    expect(fixture.client.getSessions()).toEqual([]);
  });

  it('stops notifying a removed listener', () => {
    // Given
    const fixture = createComponentSessionFixture();
    const listener = vi.fn();
    const subscription = fixture.client.onSessionsChanged(listener);

    // When
    subscription.remove();
    fixture.emitEvent(openDemo);

    // Then
    expect(listener).not.toHaveBeenCalled();
    expect(fixture.client.getSessions()).toHaveLength(1);
  });

  it('leaves the sessions empty when the app does not include the native module', () => {
    // Given
    const fixture = createComponentSessionFixture({ hasNativeModule: false });

    // When
    fixture.client.onSessionsChanged(() => undefined);
    fixture.client.reportContentSize('component-1', { width: 10, height: 20 });

    // Then
    expect(fixture.nativeModule.onEvent).not.toHaveBeenCalled();
    expect(fixture.nativeModule.startEventDelivery).not.toHaveBeenCalled();
    expect(fixture.nativeModule.reportContentSize).not.toHaveBeenCalled();
    expect(fixture.client.getSessions()).toEqual([]);
  });

  it('forwards a measured content size to the native module', () => {
    // Given
    const fixture = createComponentSessionFixture();

    // When
    fixture.client.reportContentSize('component-1', { width: 120, height: 48 });

    // Then
    expect(fixture.nativeModule.reportContentSize).toHaveBeenCalledWith({
      sessionId: 'component-1',
      width: 120,
      height: 48,
    });
  });
});
