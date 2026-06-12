import { GraniteBrownfieldModule } from '@granite-js/brownfield-module';
import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { AppStateProvider } from './useIsAppForeground';
import { VisibilityChangedProvider } from './useVisibilityChanged';
import { isStandaloneApp } from '../utils/standalone';

interface Props {
  isVisible: boolean;
  children: ReactNode;
}

/**
 * @name VisibilityProvider
 * @description
 * A Provider that manages whether a ReactNative view is currently in the foreground state.
 * It subscribes to the app's `visibilityChanged` event to detect and manage screen visibility.
 * In standalone (greenfield) apps there is no brownfield host emitting the event, so visibility
 * is derived from React Native's `AppState` instead.
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
    if (isStandaloneApp()) {
      const subscription = AppState.addEventListener('change', (state) => {
        setVisible(state === 'active');
      });

      return () => {
        subscription.remove();
      };
    }

    const subscription = GraniteBrownfieldModule.onVisibilityChanged(({ visible }) => {
      setVisible(visible);
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
