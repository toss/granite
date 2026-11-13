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

  it('preserves a native registry key without requiring it from older hosts', () => {
    const params = { appName: 'shopping', scheme: 'granite://shopping', sessionId: 'session-1' };
    expect(parseNativeRuntimeEvent({ name: 'openApp', params: { ...params, key: 'native:opaque' } })).toEqual({
      name: 'openApp',
      params: { ...params, key: 'native:opaque' },
    });
    expect(
      parseNativeRuntimeEvent({ name: 'openApp', params: { ...params, rootKey: 'native:root' } })
    ).toEqual({ name: 'openApp', params: { ...params, rootKey: 'native:root' } });
    expect(
      parseNativeRuntimeEvent({ name: 'openApp', params: { ...params, key: null as unknown as string } })
    ).toEqual({ name: 'openApp', params });
    for (const key of ['', 42, {}]) {
      expect(() =>
        parseNativeRuntimeEvent({ name: 'openApp', params: { ...params, key: key as string } })
      ).toThrow(InvalidNativeRuntimeEventError);
      expect(() =>
        parseNativeRuntimeEvent({ name: 'openApp', params: { ...params, rootKey: key as string } })
      ).toThrow(InvalidNativeRuntimeEventError);
    }
  });
});
