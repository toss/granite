import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouterActivityProvider, useVisibility } from './useVisibility';

vi.mock('./react-navigation/useIsFocusedSafely', () => ({ useIsFocusedSafely: () => true }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('standalone router activity', () => {
  it('tracks AppState without a registration or host provider', () => {
    const { result } = renderHook(useVisibility, {
      wrapper: ({ children }: PropsWithChildren) => <RouterActivityProvider>{children}</RouterActivityProvider>,
    });
    const listener = vi.mocked(AppState.addEventListener).mock.calls.at(-1)![1];
    act(() => listener('background'));
    expect(result.current).toBe(false);
    act(() => listener('active'));
    expect(result.current).toBe(true);
  });

  it('uses injected host activity without subscribing to global AppState', () => {
    vi.mocked(AppState.addEventListener).mockClear();
    const { result, rerender } = renderHook(useVisibility, {
      wrapper: ({ children }: PropsWithChildren) => (
        <RouterActivityProvider isActive={true}>{children}</RouterActivityProvider>
      ),
    });
    expect(result.current).toBe(true);
    expect(AppState.addEventListener).not.toHaveBeenCalled();
    rerender();
    expect(result.current).toBe(true);
  });

  it('cannot activate a nested router while its parent is inactive', () => {
    const { result } = renderHook(useVisibility, {
      wrapper: ({ children }: PropsWithChildren) => (
        <RouterActivityProvider isActive={false}>
          <RouterActivityProvider isActive={true}>{children}</RouterActivityProvider>
        </RouterActivityProvider>
      ),
    });
    expect(result.current).toBe(false);
  });
});
