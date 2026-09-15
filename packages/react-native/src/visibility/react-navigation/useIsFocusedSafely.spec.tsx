import { act, cleanup, render, renderHook } from '@testing-library/react';
import { type ReactNode, useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsFocusedSafely } from './useIsFocusedSafely';
import { AppStateProvider } from '../useIsAppForeground';
import { VisibilityChangedProvider } from '../useVisibilityChanged';
import { useVisibilityEffect } from '../useVisibilityEffect';

function createNavigation(initialFocus: boolean) {
  let focused = initialFocus;
  const listeners = { focus: new Set<() => void>(), blur: new Set<() => void>() };
  return {
    isFocused: () => focused,
    addListener(event: 'focus' | 'blur', listener: () => void) {
      listeners[event].add(listener);
      return () => {
        listeners[event].delete(listener);
      };
    },
    setFocused(value: boolean) {
      focused = value;
      listeners[value ? 'focus' : 'blur'].forEach((listener) => listener());
    },
    listenerCount: () => listeners.focus.size + listeners.blur.size,
  };
}

let navigation: ReturnType<typeof createNavigation> | undefined;
vi.mock('./useNavigationSafely', () => ({ useNavigationSafely: () => navigation }));

beforeEach(() => {
  navigation = undefined;
});
afterEach(cleanup);

describe('useIsFocusedSafely', () => {
  it('returns true without a navigation context', () => {
    const { result } = renderHook(useIsFocusedSafely);
    expect(result.current).toBe(true);
  });

  it.each([false, true])('reads the initial focus snapshot (%s)', (focused) => {
    navigation = createNavigation(focused);
    const { result } = renderHook(useIsFocusedSafely);
    expect(result.current).toBe(focused);
  });

  it.each([false, true])('detects a change from %s before its subscription starts', (initiallyFocused) => {
    const store = createNavigation(initiallyFocused);
    navigation = store;
    function CommitChange({ children }: { readonly children: ReactNode }) {
      useLayoutEffect(() => {
        expect(store.listenerCount()).toBe(0);
        store.setFocused(!initiallyFocused);
      }, []);
      return children;
    }
    const { result } = renderHook(useIsFocusedSafely, { wrapper: CommitChange });
    expect(result.current).toBe(!initiallyFocused);
  });

  it('reads the current snapshot for focus and blur notifications', () => {
    const store = createNavigation(false);
    navigation = store;
    const { result } = renderHook(useIsFocusedSafely);
    act(() => store.setFocused(true));
    expect(result.current).toBe(true);
    act(() => store.setFocused(false));
    expect(result.current).toBe(false);
  });

  it('replaces subscriptions when navigation changes and removes them on unmount', () => {
    const first = createNavigation(true);
    const second = createNavigation(false);
    navigation = first;
    const { result, rerender, unmount } = renderHook(useIsFocusedSafely);
    expect(first.listenerCount()).toBe(2);
    navigation = second;
    rerender();
    expect(first.listenerCount()).toBe(0);
    expect(second.listenerCount()).toBe(2);
    expect(result.current).toBe(false);
    act(() => first.setFocused(false));
    expect(result.current).toBe(false);
    act(() => second.setFocused(true));
    expect(result.current).toBe(true);
    unmount();
    expect(second.listenerCount()).toBe(0);
  });

  it('restores the fallback when navigation is removed', () => {
    const store = createNavigation(false);
    navigation = store;
    const { result, rerender } = renderHook(useIsFocusedSafely);
    navigation = undefined;
    rerender();
    expect(result.current).toBe(true);
    expect(store.listenerCount()).toBe(0);
  });

  it('starts a visibility effect after focus changes before subscription', () => {
    const store = createNavigation(false);
    navigation = store;
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    function Consumer() {
      useVisibilityEffect(effect);
      return null;
    }
    function CommitChange() {
      useLayoutEffect(() => store.setFocused(true), []);
      return null;
    }
    const { unmount } = render(
      <AppStateProvider>
        <VisibilityChangedProvider isVisible={true}>
          <Consumer />
          <CommitChange />
        </VisibilityChangedProvider>
      </AppStateProvider>
    );
    expect(effect).toHaveBeenCalledTimes(1);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
