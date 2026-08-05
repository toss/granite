import { describe, expect, it } from 'vitest';
import { InvalidNativeRuntimeEventError } from './errors';
import { parseNativeRuntimeEvent } from './parseNativeRuntimeEvent';

describe('parseNativeRuntimeEvent', () => {
  it('parses the public session lifecycle events', () => {
    expect(
      parseNativeRuntimeEvent({
        name: 'openApp',
        params: {
          appName: 'cart',
          scheme: 'granite://cart/products/1',
          sessionId: 'session-1',
        },
      })
    ).toEqual({
      name: 'openApp',
      params: {
        appName: 'cart',
        scheme: 'granite://cart/products/1',
        sessionId: 'session-1',
      },
    });

    expect(
      parseNativeRuntimeEvent({
        name: 'sessionVisibilityChanged',
        params: { isVisible: false, sessionId: 'session-1' },
      })
    ).toEqual({
      name: 'sessionVisibilityChanged',
      params: { isVisible: false, sessionId: 'session-1' },
    });
  });

  it('rejects unknown events and missing required parameters', () => {
    expect(() => parseNativeRuntimeEvent({ name: 'unknown', params: {} })).toThrow(InvalidNativeRuntimeEventError);
    expect(() =>
      parseNativeRuntimeEvent({
        name: 'closeApp',
        params: {},
      })
    ).toThrow(InvalidNativeRuntimeEventError);
  });
});
