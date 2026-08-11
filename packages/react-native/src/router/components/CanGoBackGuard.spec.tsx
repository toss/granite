import { render } from '@testing-library/react';
import { BackHandler, Platform } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanGoBackGuard } from './CanGoBackGuard';

function mockPlatformOS(os: typeof Platform.OS) {
  vi.spyOn(Platform, 'OS', 'get').mockReturnValue(os);
}

describe('CanGoBackGuard', () => {
  beforeEach(() => {
    vi.mocked(BackHandler.addEventListener).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes Android hardware back events to onBack and consumes the native event', () => {
    mockPlatformOS('android');

    const onBack = vi.fn();

    render(
      <CanGoBackGuard canGoBack={false} hasBackEvent={true} isInitialScreen={true} onBack={onBack}>
        <div />
      </CanGoBackGuard>
    );

    const handler = vi.mocked(BackHandler.addEventListener).mock.calls[0]?.[1];

    expect(BackHandler.addEventListener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
    expect(handler?.()).toBe(true);
    expect(onBack).toHaveBeenCalledWith({ source: 'androidHardwareBackPress' });
  });

  it('does not register Android hardware back when no back event exists', () => {
    mockPlatformOS('android');

    const onBack = vi.fn();

    render(
      <CanGoBackGuard canGoBack={true} hasBackEvent={false} isInitialScreen={true} onBack={onBack}>
        <div />
      </CanGoBackGuard>
    );

    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });

  it('registers the iOS swipe back handler while back events exist', () => {
    mockPlatformOS('ios');

    const onBack = vi.fn();
    const setiOSBackPressHandler = vi.fn();

    const { unmount } = render(
      <CanGoBackGuard
        canGoBack={true}
        hasBackEvent={true}
        isInitialScreen={true}
        onBack={onBack}
        setiOSBackPressHandler={setiOSBackPressHandler}
      >
        <div />
      </CanGoBackGuard>
    );

    setiOSBackPressHandler.mock.calls[0]?.[0].handler();

    expect(setiOSBackPressHandler).toHaveBeenCalledWith({ handler: expect.any(Function) });
    expect(onBack).toHaveBeenCalledWith({ source: 'iosSwipeGesture' });

    unmount();

    expect(setiOSBackPressHandler).toHaveBeenLastCalledWith({});
  });

  it('unsets the iOS back press handler on unmount so the registered handler is initialized to null', () => {
    mockPlatformOS('ios');

    let registeredHandler: (() => void) | null = null;
    // destructures params like legacy host implementations — must not crash on unset
    const setiOSBackPressHandler = vi.fn(({ handler }: { handler?: () => void }) => {
      registeredHandler = handler ?? null;
    });

    const { unmount } = render(
      <CanGoBackGuard
        canGoBack={true}
        hasBackEvent={true}
        isInitialScreen={true}
        setiOSBackPressHandler={setiOSBackPressHandler}
      >
        <div />
      </CanGoBackGuard>
    );

    expect(registeredHandler).toEqual(expect.any(Function));

    unmount();

    expect(setiOSBackPressHandler).toHaveBeenLastCalledWith({});
    expect(registeredHandler).toBeNull();
  });

  it('unsets the iOS back press handler when back events no longer exist', () => {
    mockPlatformOS('ios');

    let registeredHandler: (() => void) | null = null;
    // destructures params like legacy host implementations — must not crash on unset
    const setiOSBackPressHandler = vi.fn(({ handler }: { handler?: () => void }) => {
      registeredHandler = handler ?? null;
    });

    const { rerender } = render(
      <CanGoBackGuard
        canGoBack={true}
        hasBackEvent={true}
        isInitialScreen={true}
        setiOSBackPressHandler={setiOSBackPressHandler}
      >
        <div />
      </CanGoBackGuard>
    );

    expect(registeredHandler).toEqual(expect.any(Function));

    rerender(
      <CanGoBackGuard
        canGoBack={true}
        hasBackEvent={false}
        isInitialScreen={true}
        setiOSBackPressHandler={setiOSBackPressHandler}
      >
        <div />
      </CanGoBackGuard>
    );

    expect(setiOSBackPressHandler).toHaveBeenLastCalledWith({});
    expect(registeredHandler).toBeNull();
  });

  it('disables iOS swipe when the current state should block default back navigation', () => {
    mockPlatformOS('ios');

    const setIosSwipeGestureEnabled = vi.fn();

    const { unmount } = render(
      <CanGoBackGuard
        canGoBack={false}
        hasBackEvent={true}
        isInitialScreen={true}
        setIosSwipeGestureEnabled={setIosSwipeGestureEnabled}
      >
        <div />
      </CanGoBackGuard>
    );

    expect(setIosSwipeGestureEnabled).toHaveBeenCalledWith({ isEnabled: false });

    unmount();

    expect(setIosSwipeGestureEnabled).toHaveBeenLastCalledWith({ isEnabled: true });
  });
});
