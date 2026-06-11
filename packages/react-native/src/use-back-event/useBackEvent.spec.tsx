import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BackEventProvider, useBackEvent, useBackEventState } from './useBackEvent';

vi.mock('../visibility', () => ({
  useVisibility: () => true,
}));

function BackEventProviderWrapper({ children }: { children: ReactNode }) {
  return <BackEventProvider>{children}</BackEventProvider>;
}

describe('useBackEventState', () => {
  it('keeps legacy back event handlers variadic and runs every handler', () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const { result } = renderHook(() => useBackEventState());

    act(() => {
      result.current.addEventListener(firstHandler, secondHandler);
    });

    result.current.onBack();

    expect(result.current.hasBackEvent).toBe(true);
    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('ignores legacy back event handler return values', () => {
    const handler = vi.fn(() => false);
    const { result } = renderHook(() => useBackEventState());

    act(() => {
      result.current.addEventListener(handler);
    });

    result.current.onBack();

    expect(result.current.hasBackEvent).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('derives legacy back event state from registered handlers', () => {
    const handler = vi.fn();
    const { result } = renderHook(() => useBackEventState());

    act(() => {
      result.current.addEventListener(handler);
    });

    expect(result.current.hasBackEvent).toBe(true);

    act(() => {
      result.current.removeEventListener(handler);
    });

    result.current.onBack();

    expect(result.current.hasBackEvent).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps the legacy state object stable while back event existence does not change', () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const { result } = renderHook(() => useBackEventState());

    act(() => {
      result.current.addEventListener(firstHandler);
    });

    const activeBackEvent = result.current;

    act(() => {
      result.current.addEventListener(secondHandler);
    });

    expect(result.current).toBe(activeBackEvent);
  });
});

describe('useBackEvent', () => {
  it('keeps the returned back event controls stable when provider state changes', () => {
    const handler = vi.fn();
    const renderCount = vi.fn();
    const { result } = renderHook(
      () => {
        renderCount();

        return useBackEvent();
      },
      {
        wrapper: BackEventProviderWrapper,
      }
    );
    const backEvent = result.current;

    act(() => {
      result.current.addEventListener(handler);
    });

    expect(result.current).toBe(backEvent);
    expect(renderCount).toHaveBeenCalledTimes(1);
  });
});
