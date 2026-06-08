import { ReactNode, useEffect } from 'react';
import { BackHandler } from 'react-native';
import type { BackEvent } from '../../use-back-event';

type SetIosSwipeGestureEnabled = ({ isEnabled }: { isEnabled: boolean }) => Promise<void> | void;
type SetIOSBackPressHandler = ({ handler }: { handler: () => void }) => Promise<void> | void;

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
  setiOSBackPressHandler?: SetIOSBackPressHandler;
}) {
  useEffect(() => {
    if (!isInitialScreen || !canGoBack) {
      setIosSwipeGestureEnabled?.({ isEnabled: false });

      return () => {
        setIosSwipeGestureEnabled?.({ isEnabled: true });
      };
    }

    return;
  }, [canGoBack, isInitialScreen, setIosSwipeGestureEnabled]);

  useEffect(() => {
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
    if (!hasBackEvent || setiOSBackPressHandler == null) {
      return;
    }

    setiOSBackPressHandler({
      handler: () => {
        onBack?.({ source: 'iosSwipeGesture' });
      },
    });

    return () => {
      setiOSBackPressHandler({ handler: () => {} });
    };
  }, [hasBackEvent, onBack, setiOSBackPressHandler]);

  return <>{children}</>;
}
