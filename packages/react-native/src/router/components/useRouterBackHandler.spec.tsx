import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useInternalRouterBackHandler } from './useRouterBackHandler';
import { BackEventProvider, useBackEvent, useBackHandler } from '../../use-back-event';

vi.mock('../../visibility', () => ({
  useVisibility: () => true,
}));

function createNavigationContainerRef() {
  return {
    canGoBack: vi.fn(() => true),
    goBack: vi.fn(),
  };
}

function BackEventProviderWrapper({ children }: { children: ReactNode }) {
  return <BackEventProvider>{children}</BackEventProvider>;
}

function useBackHandlerTest({
  navigationContainerRef,
  onClose,
}: {
  navigationContainerRef: ReturnType<typeof createNavigationContainerRef>;
  onClose?: () => void;
}) {
  const backEvent = useBackEvent();
  const backHandler = useBackHandler();
  const routerBackHandler = useInternalRouterBackHandler({
    navigationContainerRef: navigationContainerRef as any,
    onClose,
  });

  return {
    backEvent,
    backHandler,
    routerBackHandler,
  };
}

describe('useInternalRouterBackHandler', () => {
  it('stops when a back handler handles the back event', () => {
    const navigationContainerRef = createNavigationContainerRef();
    const legacyHandler = vi.fn();
    const backHandler = vi.fn(() => true);
    const { result } = renderHook(() => useBackHandlerTest({ navigationContainerRef }), {
      wrapper: BackEventProviderWrapper,
    });

    act(() => {
      result.current.backEvent.addEventListener(legacyHandler);
      result.current.backHandler.addEventListener(backHandler);
    });

    act(() => {
      result.current.routerBackHandler.handleBackEvent({ source: 'backButton' });
    });

    expect(backHandler).toHaveBeenCalledWith({ source: 'backButton' });
    expect(legacyHandler).not.toHaveBeenCalled();
    expect(navigationContainerRef.goBack).not.toHaveBeenCalled();
  });

  it('runs every legacy handler when back handlers do not handle the event', () => {
    const navigationContainerRef = createNavigationContainerRef();
    const backHandler = vi.fn(() => false);
    const firstLegacyHandler = vi.fn();
    const secondLegacyHandler = vi.fn();
    const { result } = renderHook(() => useBackHandlerTest({ navigationContainerRef }), {
      wrapper: BackEventProviderWrapper,
    });

    act(() => {
      result.current.backHandler.addEventListener(backHandler);
      result.current.backEvent.addEventListener(firstLegacyHandler, secondLegacyHandler);
    });

    act(() => {
      result.current.routerBackHandler.handleBackEvent({ source: 'iosSwipeGesture' });
    });

    expect(backHandler).toHaveBeenCalledWith({ source: 'iosSwipeGesture' });
    expect(firstLegacyHandler).toHaveBeenCalledTimes(1);
    expect(secondLegacyHandler).toHaveBeenCalledTimes(1);
    expect(navigationContainerRef.goBack).not.toHaveBeenCalled();
  });

  it('runs default back when back handlers return false or undefined and no legacy handler exists', () => {
    const navigationContainerRef = createNavigationContainerRef();
    const backHandler = vi.fn(() => false);
    const passiveHandler = vi.fn();
    const { result } = renderHook(() => useBackHandlerTest({ navigationContainerRef }), {
      wrapper: BackEventProviderWrapper,
    });

    act(() => {
      result.current.backHandler.addEventListener(backHandler);
      result.current.backHandler.addEventListener(passiveHandler);
    });

    act(() => {
      result.current.routerBackHandler.handleBackEvent({ source: 'androidHardwareBackPress' });
    });

    expect(passiveHandler).toHaveBeenCalledWith({ source: 'androidHardwareBackPress' });
    expect(backHandler).toHaveBeenCalledWith({ source: 'androidHardwareBackPress' });
    expect(navigationContainerRef.goBack).toHaveBeenCalledTimes(1);
  });

  it('uses backButton as the source for the header back handler', () => {
    const navigationContainerRef = createNavigationContainerRef();
    const backHandler = vi.fn(() => true);
    const { result } = renderHook(() => useBackHandlerTest({ navigationContainerRef }), {
      wrapper: BackEventProviderWrapper,
    });

    act(() => {
      result.current.backHandler.addEventListener(backHandler);
    });

    act(() => {
      result.current.routerBackHandler.handler();
    });

    expect(backHandler).toHaveBeenCalledWith({ source: 'backButton' });
  });
});
