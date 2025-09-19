import { ReactNode, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useIsInitialScreen } from '../hooks/useIsInitialScreen';

export function CanGoBackGuard({
  children,
  canGoBack,
  onBack,
  setIosSwipeGestureEnabled,
}: {
  canGoBack: boolean;
  children: ReactNode;
  onBack?: () => void;
  setIosSwipeGestureEnabled?: ({ isEnabled }: { isEnabled: boolean }) => void;
}) {
  const isInitialScreen = useIsInitialScreen();

  const shouldBlockGoingBack = !canGoBack;

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
    if (shouldBlockGoingBack) {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack?.();
        return true;
      });

      return () => {
        subscription.remove();
      };
    }

    return;
  }, [shouldBlockGoingBack, onBack]);

  return <>{children}</>;
}
