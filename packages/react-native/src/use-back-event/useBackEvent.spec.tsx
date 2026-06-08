import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBackEventState } from './useBackEvent';

vi.mock('../visibility', () => ({
  useVisibility: () => true,
}));

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
});
