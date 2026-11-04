import { ReactNode, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import type { BackEvent } from '../../use-back-event';
import { useVisibility } from '../../visibility/useVisibility';

type SetIosSwipeGestureEnabled = ({ isEnabled }: { isEnabled: boolean }) => Promise<void> | void;

/**
 * Registers the iOS back press handler. Called with empty params (`{}`, no
 * `handler`) to unset — mirroring `unsetBackPressHandler()`, which calls
 * `setBackPressHandler` with empty params. In that case implementations should
 * initialize the registered handler to `null`, not keep an empty function
 * registered.
 */
export type SetIOSBackPressHandler = ({ handler }: { handler?: () => void }) => Promise<void> | void;

export function CanGoBackGuard({
  children,
  canGoBack,
  hasBackEvent,
  onBack,
  isInitialScreen,
  hasRootBackAction = false,
  setIosSwipeGestureEnabled,
  setiOSBackPressHandler,
}: {
  canGoBack: boolean;
  hasBackEvent: boolean;
  isInitialScreen: boolean;
  hasRootBackAction?: boolean;
  children: ReactNode;
  onBack?: (event: BackEvent) => void;
  setIosSwipeGestureEnabled?: SetIosSwipeGestureEnabled;
  setiOSBackPressHandler?: SetIOSBackPressHandler;
}) {
  const isVisible = useVisibility();

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    if (!isInitialScreen || !canGoBack) {
      setIosSwipeGestureEnabled?.({ isEnabled: false });

      return () => {
        setIosSwipeGestureEnabled?.({ isEnabled: true });
      };
    }

    return;
  }, [canGoBack, isInitialScreen, setIosSwipeGestureEnabled]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isVisible) {
      return;
    }

    if (!hasBackEvent && !(isInitialScreen && hasRootBackAction)) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.({ source: 'androidHardwareBackPress' });

      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [hasBackEvent, hasRootBackAction, isInitialScreen, isVisible, onBack]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    if (!hasBackEvent || setiOSBackPressHandler == null) {
      return;
    }

    setiOSBackPressHandler({
      handler: () => {
        onBack?.({ source: 'iosSwipeGesture' });
      },
    });

    return () => {
      setiOSBackPressHandler?.({});
    };
  }, [hasBackEvent, onBack, setiOSBackPressHandler]);

  return <>{children}</>;
}
