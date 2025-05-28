import { ReactNode, useEffect } from 'react';
import { BackHandler } from 'react-native';

export function CanGoBackGuard({
  children,
  canGoBack,
  onBack,
}: {
  canGoBack: boolean;
  children: ReactNode;
  onBack?: () => void;
}) {
  const shouldBlockGoingBack = !canGoBack;

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
