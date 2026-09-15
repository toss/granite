import { cleanup, render } from '@testing-library/react';
import { type EffectCallback, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from './useIsAppForeground';
import { VisibilityChangedProvider } from './useVisibilityChanged';
import * as visibility from './useVisibilityEffect';

const navigation = vi.hoisted(() => ({
  focused: true,
  isFocused() { return this.focused; },
  addListener: () => () => {},
}));
vi.mock('./react-navigation/useNavigationSafely', () => ({
  useNavigationSafely: () => navigation,
}));

function Consumer({ effect }: { readonly effect: EffectCallback }) {
  visibility.useVisibilityEffect(effect);
  return null;
}

function Boundary({ visible, children }: { readonly visible: boolean; readonly children: ReactNode }) {
  return (
    <AppStateProvider>
      <VisibilityChangedProvider isVisible={visible}>{children}</VisibilityChangedProvider>
    </AppStateProvider>
  );
}

function screen(visible: boolean, effect: EffectCallback) {
  return (
    <Boundary visible={visible}>
      <Consumer effect={effect} />
    </Boundary>
  );
}

afterEach(() => {
  cleanup();
  navigation.focused = true;
});

describe('useVisibilityEffect', () => {
  it('exports a visibility effect hook', () => {
    expect(visibility).toHaveProperty('useVisibilityEffect', expect.any(Function));
  });

  it('does not set up or clean up an effect when mounted and unmounted hidden', () => {
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    const { unmount } = render(screen(false, effect));
    unmount();
    expect(effect).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
  });

  it('sets up on visible mount and cleans up on direct unmount', () => {
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    const { unmount } = render(screen(true, effect));
    expect(effect).toHaveBeenCalledTimes(1);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('cleans up when hidden and sets up again when visible', () => {
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    const { rerender, unmount } = render(screen(true, effect));
    rerender(screen(false, effect));
    expect(dispose).toHaveBeenCalledTimes(1);
    rerender(screen(true, effect));
    expect(effect).toHaveBeenCalledTimes(2);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it('does not clean up again when unmounted after becoming hidden', () => {
    const dispose = vi.fn();
    const { rerender, unmount } = render(screen(true, () => dispose));
    rerender(screen(false, () => dispose));
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps a stable effect running across visible rerenders', () => {
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    const { rerender } = render(screen(true, effect));
    rerender(screen(true, effect));
    expect(effect).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
  });

  it('cleans up the previous callback before running its replacement while visible', () => {
    const events: string[] = [];
    const first = () => {
      events.push('first setup');
      return () => {
        events.push('first cleanup');
      };
    };
    const second = () => {
      events.push('second setup');
    };
    const { rerender } = render(screen(true, first));
    rerender(screen(true, second));
    expect(events).toEqual(['first setup', 'first cleanup', 'second setup']);
  });

  it('uses the latest callback when it becomes visible after a hidden update', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(screen(false, first));
    rerender(screen(false, second));
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    rerender(screen(true, second));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('allows an effect without a cleanup function', () => {
    const effect = vi.fn(() => {});
    const { rerender, unmount } = render(screen(true, effect));
    rerender(screen(false, effect));
    unmount();
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('cleans up when navigator focus is lost while native visibility stays true', () => {
    const dispose = vi.fn();
    const effect = vi.fn(() => dispose);
    const { rerender } = render(screen(true, effect));
    navigation.focused = false;
    rerender(screen(true, effect));
    expect(dispose).toHaveBeenCalledTimes(1);
    navigation.focused = true;
    rerender(screen(true, effect));
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it('keeps sibling visibility boundaries independent', () => {
    const firstDispose = vi.fn();
    const secondDispose = vi.fn();
    const first = vi.fn(() => firstDispose);
    const second = vi.fn(() => secondDispose);
    const tree = (firstVisible: boolean) => (
      <>
        <Boundary visible={firstVisible}>
          <Consumer effect={first} />
        </Boundary>
        <Boundary visible={true}>
          <Consumer effect={second} />
        </Boundary>
      </>
    );
    const { rerender } = render(tree(true));
    rerender(tree(false));
    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(secondDispose).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
