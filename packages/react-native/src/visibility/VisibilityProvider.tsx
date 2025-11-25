import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { AppStateProvider } from './useIsAppForeground';
import { VisibilityChangedProvider } from './useVisibilityChanged';
import { nativeEventEmitter } from '../native-event-emitter/nativeEventEmitter';

interface Props {
  isVisible: boolean;
  children: ReactNode;
}

/**
 * @name VisibilityProvider
 * @description
 * A Provider that manages whether a ReactNative view is currently in the foreground state.
 * It subscribes to the app's `visibilityChanged` event to detect and manage screen visibility.
 * @param {boolean} isVisible - Whether the app is in the foreground state.
 * @param {ReactNode | undefined} children - Child components that observe `visibilityChanged` and `AppState` event.
 * @returns {ReactElement} - A React Provider component wrapped with `VisibilityChangedProvider`.
 * @example
 * ```typescript
 *
 * function App() {
 *  return (
 *   <VisibilityProvider isVisible={true}>
 *     <MyApp />
 *   </VisibilityProvider>
 *  );
 * }
 *
 * ```
 */
export function VisibilityProvider({ isVisible, children }: Props): ReactElement {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    const subscription = nativeEventEmitter.addListener('visibilityChanged', (nextVisible) => {
      setVisible(nextVisible);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <VisibilityChangedProvider isVisible={visible}>
      <AppStateProvider>{children}</AppStateProvider>
    </VisibilityChangedProvider>
  );
}
