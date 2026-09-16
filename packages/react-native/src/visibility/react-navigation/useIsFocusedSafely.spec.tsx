import { act, cleanup, render, renderHook } from '@testing-library/react';
import { type EffectCallback, type ReactNode, useEffect, useLayoutEffect } from 'react';
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

  it.each([false, true])('follows committed focus snapshots for visibility effects (initially %s)', (initiallyFocused) => {
    const store = createNavigation(initiallyFocused);
    navigation = store;
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    function Consumer() {
      useVisibilityEffect(effect);
      return null;
    }
    function CommitChange() {
      useLayoutEffect(() => store.setFocused(!initiallyFocused), []);
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
    expect(dispose).toHaveBeenCalledTimes(initiallyFocused ? 1 : 0);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(store.listenerCount()).toBe(0);
  });

  it.each(['mount', 'callback replacement'] as const)(
    'keeps the committed visibility effect active across rapid refocus during %s',
    (scenario) => {
      const store = createNavigation(true);
      navigation = store;
      const firstDispose = vi.fn();
      const firstEffect = vi.fn(() => firstDispose);
      const dispose = vi.fn();
      const effect = vi.fn(() => dispose);
      function Consumer({ callback }: { readonly callback: EffectCallback }) {
        useVisibilityEffect(callback);
        return null;
      }
      function CommitChange({ changeFocus }: { readonly changeFocus: boolean }) {
        useLayoutEffect(() => {
          if (changeFocus) {
            store.setFocused(false);
          }
        }, [changeFocus]);
        useEffect(() => {
          if (changeFocus) {
            expect(effect).toHaveBeenCalledTimes(1);
            store.setFocused(true);
            // Refocusing must not restart the effect from the visible commit.
            expect(effect).toHaveBeenCalledTimes(1);
            expect(dispose).not.toHaveBeenCalled();
          }
        }, [changeFocus]);
        return null;
      }
      const screen = (changeFocus: boolean) => (
        <AppStateProvider>
          <VisibilityChangedProvider isVisible={true}>
            <Consumer callback={changeFocus ? effect : firstEffect} />
            <CommitChange changeFocus={changeFocus} />
          </VisibilityChangedProvider>
        </AppStateProvider>
      );
      const { rerender, unmount } = render(screen(scenario === 'mount'));
      rerender(screen(true));
      expect(effect).toHaveBeenCalledTimes(1);
      expect(firstDispose).toHaveBeenCalledTimes(scenario === 'mount' ? 0 : 1);
      expect(store.listenerCount()).toBe(2);

      rerender(screen(true));
      expect(effect).toHaveBeenCalledTimes(1);
      expect(dispose).not.toHaveBeenCalled();

      unmount();
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(store.listenerCount()).toBe(0);
    }
  );

  it('cleans up and restarts visibility effects as focus snapshots are committed', () => {
    const store = createNavigation(true);
    navigation = store;
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    function Consumer() {
      useVisibilityEffect(effect);
      return null;
    }
    function CommitChange() {
      useLayoutEffect(() => store.setFocused(false), []);
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
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(store.listenerCount()).toBe(2);

    act(() => store.setFocused(true));
    expect(effect).toHaveBeenCalledTimes(2);
    act(() => store.setFocused(false));
    expect(dispose).toHaveBeenCalledTimes(2);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(store.listenerCount()).toBe(0);
  });
});
