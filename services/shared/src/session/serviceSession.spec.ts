import { describe, expect, it } from 'vitest';
import {
  createServiceSessionInitialProps,
  parseServiceSessionEvent,
  reduceServiceSessions,
} from './serviceSession';

describe('serviceSession', () => {
  it('parses a native openService event into a session event', () => {
    const event = parseServiceSessionEvent({
      eventName: 'openService',
      body: {
        identifier: 'session-1',
        serviceName: 'catalog',
        url: 'granite://catalog/products/42',
      },
    });

    expect(event).toEqual({
      kind: 'open',
      identifier: 'session-1',
      serviceName: 'catalog',
      url: 'granite://catalog/products/42',
    });
  });

  it('ignores malformed native session events', () => {
    expect(
      parseServiceSessionEvent({
        eventName: 'openService',
        body: { identifier: 'session-1' },
      })
    ).toBeNull();
    expect(parseServiceSessionEvent({ eventName: 'unknown', body: {} })).toBeNull();
  });

  it('opens, updates visibility, and closes a session by identifier', () => {
    const opened = reduceServiceSessions([], {
      kind: 'open',
      identifier: 'session-1',
      serviceName: 'catalog',
      url: 'granite://catalog/products/42',
    });
    const visible = reduceServiceSessions(opened, {
      kind: 'visibilityChanged',
      identifier: 'session-1',
      isVisible: true,
    });
    const closed = reduceServiceSessions(visible, {
      kind: 'close',
      identifier: 'session-1',
    });

    expect(opened).toEqual([
      {
        identifier: 'session-1',
        serviceName: 'catalog',
        url: 'granite://catalog/products/42',
        isVisible: false,
      },
    ]);
    expect(visible[0]?.isVisible).toBe(true);
    expect(closed).toEqual([]);
  });

  it('uses the complete service URL as the mounted app initial scheme', () => {
    // Given
    const initialProps = {
      platform: 'android',
      initialColorPreference: 'light',
      scheme: 'granite://shared',
    } as const;

    // When
    const serviceInitialProps = createServiceSessionInitialProps(
      initialProps,
      'granite://catalog/search'
    );

    // Then
    expect(serviceInitialProps).toEqual({
      platform: 'android',
      initialColorPreference: 'light',
      scheme: 'granite://catalog/search',
    });
  });
});
