import { Platform } from 'react-native';
import { useIsFocusedSafely } from './react-navigation/useIsFocusedSafely';
import { useIsAppForeground } from './useIsAppForeground';
import { useVisibilityChanged } from './useVisibilityChanged';

/**
 * @public
 * @category Screen Control
 * @name useVisibility
 * @description
 * Returns whether the screen is visible to the user.
 * Returns `true` if the app's screen is currently visible to the user, and `false` if it's not. However, the screen visibility state does not change when opening and closing the system share modal ([share](/reference/react-native/Share/share)).
 *
 * Usage examples:
 * - Returns `false` when switching to another app or pressing the home button.
 * - Returns `true` when returning to the granite app or when the screen becomes visible.
 * - Returns `false` when navigating to another service within the granite app.
 *
 * @returns {boolean} - Whether the current screen is visible to the user.
 * @example
 *
 * ### Example of checking screen visibility
 *
 * ```tsx
 * import { useEffect } from 'react';
 * import { Text } from 'react-native';
 * import { useVisibility } from '@granite-js/react-native';
 *
 * export function UseVisibilityExample() {
 *   const visibility = useVisibility();
 *
 *   useEffect(() => {
 *     console.log({ visibility });
 *   }, [visibility]);
 *
 *   return <Text>Logs are created when leaving and returning to the home screen.</Text>;
 * }
 * ```
 */
export function useVisibility(): boolean {
  const visible = useVisibilityChanged();
  const isForeground = useIsAppForeground();
  const isReactNavigationFocused = useIsFocusedSafely();

  /**
   * We don't use AppState in Android. (AppState uses `onHostPause` and `onHostResume`.)
   * From Android version 5.172.0, `visibilityChanged` uses `onHostStop` and `onHostStart`.
   *  - For example, in Android, the `visible` state is maintained even when the share modal appears (share app bridge call).
   */
  const androidCondition = visible && isReactNavigationFocused;
  const iOSCondition = visible && isForeground && isReactNavigationFocused;

  return Platform.OS === 'android' ? androidCondition : iOSCondition;
}
