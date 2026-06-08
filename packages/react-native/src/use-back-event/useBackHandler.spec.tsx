import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BackEventProvider, useBackEventContext } from './useBackEvent';
import { useBackHandler } from './useBackHandler';

vi.mock('../visibility', () => ({
  useVisibility: () => true,
}));

function BackEventProviderWrapper({ children }: { children: ReactNode }) {
  return <BackEventProvider>{children}</BackEventProvider>;
}

function useBackHandlerTest() {
  const backHandler = useBackHandler();
  const backEventContext = useBackEventContext();

  return {
    backHandler,
    backEventContext,
  };
}

describe('useBackHandler', () => {
  it('exposes removal only through the returned subscription', () => {
    const { result } = renderHook(() => useBackHandler(), {
      wrapper: BackEventProviderWrapper,
    });

    expect(result.current).toEqual({
      addEventListener: expect.any(Function),
    });
    expect('removeEventListener' in result.current).toBe(false);
  });

  it('bubbles from the latest handler and stops when one explicitly handles the event', () => {
    const parent = vi.fn(() => true);
    const child = vi.fn(() => false);
    const overlay = vi.fn(() => true);
    const { result } = renderHook(() => useBackHandlerTest(), {
      wrapper: BackEventProviderWrapper,
    });

    act(() => {
      result.current.backHandler.addEventListener(parent);
      result.current.backHandler.addEventListener(child);
      result.current.backHandler.addEventListener(overlay);
    });

    expect(result.current.backEventContext.onBackHandler({ source: 'iosSwipeGesture' })).toBe(true);
    expect(overlay).toHaveBeenCalledWith({ source: 'iosSwipeGesture' });
    expect(child).not.toHaveBeenCalled();
    expect(parent).not.toHaveBeenCalled();
  });

  it('continues bubbling while handlers return false', () => {
    const parent = vi.fn(() => true);
    const child = vi.fn(() => false);
    const { result } = renderHook(() => useBackHandlerTest(), {
      wrapper: BackEventProviderWrapper,
    });

    act(() => {
      result.current.backHandler.addEventListener(parent);
      result.current.backHandler.addEventListener(child);
    });

    expect(result.current.backEventContext.onBackHandler({ source: 'backButton' })).toBe(true);
    expect(child).toHaveBeenCalledWith({ source: 'backButton' });
    expect(parent).toHaveBeenCalledWith({ source: 'backButton' });
  });

  it('allows default navigation when handlers return false or undefined', () => {
    const parent = vi.fn(() => false);
    const child = vi.fn();
    const { result } = renderHook(() => useBackHandlerTest(), {
      wrapper: BackEventProviderWrapper,
    });

    act(() => {
      result.current.backHandler.addEventListener(parent);
      result.current.backHandler.addEventListener(child);
    });

    expect(result.current.backEventContext.onBackHandler({ source: 'androidHardwareBackPress' })).toBe(false);
    expect(child).toHaveBeenCalledWith({ source: 'androidHardwareBackPress' });
    expect(parent).toHaveBeenCalledWith({ source: 'androidHardwareBackPress' });
  });

  it('removes a back handler through the returned subscription', () => {
    const handler = vi.fn(() => true);
    const { result } = renderHook(() => useBackHandlerTest(), {
      wrapper: BackEventProviderWrapper,
    });
    let subscription!: ReturnType<typeof result.current.backHandler.addEventListener>;

    act(() => {
      subscription = result.current.backHandler.addEventListener(handler);
    });

    expect(result.current.backEventContext.onBackHandler({ source: 'backButton' })).toBe(true);

    act(() => {
      subscription.remove();
    });

    expect(result.current.backEventContext.hasBackHandler).toBe(false);
    expect(result.current.backEventContext.onBackHandler({ source: 'backButton' })).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
