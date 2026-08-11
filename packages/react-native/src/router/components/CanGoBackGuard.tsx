import { ReactNode, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import type { BackEvent } from '../../use-back-event';

type SetIosSwipeGestureEnabled = ({ isEnabled }: { isEnabled: boolean }) => Promise<void> | void;

/**
 * Registers the iOS back press handler.
 */
export type SetIOSBackPressHandler = ({ handler }: { handler: () => void }) => Promise<void> | void;

/**
 * Called with no arguments to unset the handler. Implementations should
 * initialize the registered handler to `null` (e.g. `unsetBackPressHandler()`),
 * not replace it with an empty function.
 */
export type UnsetIOSBackPressHandler = () => Promise<void> | void;

export function CanGoBackGuard({
  children,
  canGoBack,
  hasBackEvent,
  onBack,
  isInitialScreen,
  setIosSwipeGestureEnabled,
  setiOSBackPressHandler,
}: {
  canGoBack: boolean;
  hasBackEvent: boolean;
  isInitialScreen: boolean;
  children: ReactNode;
  onBack?: (event: BackEvent) => void;
  setIosSwipeGestureEnabled?: SetIosSwipeGestureEnabled;
  setiOSBackPressHandler?: SetIOSBackPressHandler | UnsetIOSBackPressHandler;
}) {
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
    if (Platform.OS !== 'android') {
      return;
    }

    if (!hasBackEvent) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.({ source: 'androidHardwareBackPress' });

      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [hasBackEvent, onBack]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    if (!hasBackEvent || setiOSBackPressHandler == null) {
      return;
    }

    (setiOSBackPressHandler as SetIOSBackPressHandler)({
      handler: () => {
        onBack?.({ source: 'iosSwipeGesture' });
      },
    });

    return () => {
      (setiOSBackPressHandler as UnsetIOSBackPressHandler)();
    };
  }, [hasBackEvent, onBack, setiOSBackPressHandler]);

  return <>{children}</>;
}
