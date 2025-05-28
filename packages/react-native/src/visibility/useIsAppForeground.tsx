import { createContext, ReactElement, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface Props {
  children: ReactNode;
}

const AppStateContext = createContext<AppStateStatus | undefined>(undefined);

/**
 * @name AppStateProvider
 * @description
 * A Provider that manages the `AppState` of React Native screens. This Provider manages the app's state (active, background, etc.) and passes it to child components that subscribe to it.
 * @link https://reactnative.dev/docs/appstate
 * @param {Props} children - Child components to be wrapped by `AppStateProvider`. These components can detect and respond to changes in `AppState`.
 * @returns {ReactElement} - A React Provider component wrapped with `AppStateProvider`.
 * @example
 * ```tsx
 * export function App() {
 *   return (
 *     <AppStateProvider>
 *      <MyApp />
 *     </AppStateProvider>
 *   );
 * }
 * ```
 */
export function AppStateProvider({ children }: Props): ReactElement {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const handleAppStateChange = (status: AppStateStatus) => {
    setAppState(status);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return <AppStateContext.Provider value={appState}>{children}</AppStateContext.Provider>;
}

/**
 * @category Hooks
 * @name useIsAppForeground
 * @description
 * Returns whether the React Native app is in the foreground state.
 *
 * @see https://reactnative.dev/docs/0.72/appstate#app-states
 * @returns {boolean} - Returns whether the app is in the foreground state.
 * @throws {Error} Throws an error when the managed AppState is `null`.
 * @example
 * ```typescript
 *  const isForeground = useIsAppForeground();
 * ```
 */
export const useIsAppForeground = (): boolean => {
  const appState = useContext(AppStateContext);

  if (appState == null) {
    throw new Error('useIsAppForeground must be used within a AppStateProvider');
  }

  /**
   * In iOS, the 'inactive' state is also considered as foreground.
   * 'inactive' is a state that only exists in iOS, for example, when the control center or notification panel is open.
   * @see https://reactnative.dev/docs/0.72/appstate#app-states
   */
  return appState === 'active' || appState === 'inactive';
};
