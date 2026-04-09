import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactNativeMock = vi.hoisted(() => {
  let platformOS: 'android' | 'ios' = 'ios';
  const listeners = new Map<string, Set<(event?: { endCoordinates: { height: number } }) => void>>();
  const metrics = vi.fn(() => ({ height: 0 }));
  const addListener = vi.fn((eventName: string, listener: (event?: { endCoordinates: { height: number } }) => void) => {
    const eventListeners = listeners.get(eventName) ?? new Set();
    eventListeners.add(listener);
    listeners.set(eventName, eventListeners);

    return {
      remove: vi.fn(() => {
        listeners.get(eventName)?.delete(listener);
      }),
    };
  });
  const spring = vi.fn((value: AnimatedValue, config: { toValue: number }) => ({
    start: vi.fn(() => {
      value.setValue(config.toValue);
    }),
  }));

  class AnimatedValue {
    private value: number;

    constructor(initialValue: number) {
      this.value = initialValue;
    }

    setValue(nextValue: number) {
      this.value = nextValue;
    }

    __getValue() {
      return this.value;
    }
  }

  return {
    addListener,
    AnimatedValue,
    emit(eventName: string, event?: { endCoordinates: { height: number } }) {
      for (const listener of listeners.get(eventName) ?? []) {
        listener(event);
      }
    },
    metrics,
    reset() {
      platformOS = 'ios';
      listeners.clear();
      addListener.mockClear();
      metrics.mockClear();
      metrics.mockReturnValue({ height: 0 });
      spring.mockClear();
      Reflect.deleteProperty(globalThis, 'nativeFabricUIManager');
      Reflect.deleteProperty(globalThis, '__turboModuleProxy');
    },
    spring,
    setPlatformOS(nextPlatformOS: 'android' | 'ios') {
      platformOS = nextPlatformOS;
    },
    getPlatformOS() {
      return platformOS;
    },
  };
});

vi.mock('react-native', () => {
  const Platform = {} as { OS: 'android' | 'ios' };

  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    enumerable: true,
    get: () => reactNativeMock.getPlatformOS(),
  });

  return {
    Animated: {
      Value: reactNativeMock.AnimatedValue,
      spring: reactNativeMock.spring,
    },
    Keyboard: {
      addListener: reactNativeMock.addListener,
      metrics: reactNativeMock.metrics,
    },
    Platform,
  };
});

import { useKeyboardAnimatedHeight } from './useKeyboardAnimatedHeight';

describe('useKeyboardAnimatedHeight', () => {
  beforeEach(() => {
    reactNativeMock.reset();
  });

  it('uses keyboardWill events on iOS', () => {
    renderHook(() => useKeyboardAnimatedHeight());

    expect(reactNativeMock.addListener).toHaveBeenNthCalledWith(1, 'keyboardWillShow', expect.any(Function));
    expect(reactNativeMock.addListener).toHaveBeenNthCalledWith(2, 'keyboardWillHide', expect.any(Function));
  });

  it('uses keyboardDid events on Android New Architecture', () => {
    reactNativeMock.setPlatformOS('android');
    reactNativeMock.metrics.mockReturnValue({ height: 120 });
    Object.defineProperty(globalThis, 'nativeFabricUIManager', {
      configurable: true,
      value: {},
    });

    const { result } = renderHook(() => useKeyboardAnimatedHeight());

    expect((result.current as unknown as { __getValue(): number }).__getValue()).toBe(120);
    expect(reactNativeMock.addListener).toHaveBeenNthCalledWith(1, 'keyboardDidShow', expect.any(Function));
    expect(reactNativeMock.addListener).toHaveBeenNthCalledWith(2, 'keyboardDidHide', expect.any(Function));

    act(() => {
      reactNativeMock.emit('keyboardDidShow', { endCoordinates: { height: 240 } });
    });

    expect((result.current as unknown as { __getValue(): number }).__getValue()).toBe(240);

    act(() => {
      reactNativeMock.emit('keyboardDidHide');
    });

    expect((result.current as unknown as { __getValue(): number }).__getValue()).toBe(0);
  });

  it('does not subscribe on Android Old Architecture', () => {
    reactNativeMock.setPlatformOS('android');

    renderHook(() => useKeyboardAnimatedHeight());

    expect(reactNativeMock.addListener).not.toHaveBeenCalled();
  });
});
