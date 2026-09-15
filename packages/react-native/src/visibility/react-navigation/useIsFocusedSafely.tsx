import { useCallback, useDebugValue, useSyncExternalStore } from 'react';
import { useNavigationSafely } from './useNavigationSafely';

/**
 * @name useIsFocusedSafely
 * @category Hooks
 * @kind function
 * @link https://github.com/react-navigation/react-navigation/blob/%40react-navigation/native%406.1.18/packages/core/src/useIsFocused.tsx
 * @description
 * Returns whether the current screen is in focus.
 *
 * A Hook that safely uses `useIsFocused` provided by `@react-navigation/native`.
 * This Hook is based on `useIsFocused` from `@react-navigation/native`, but modified to not throw errors when `navigation` or `root` objects are `null` or `undefined`.
 * It ensures that users don't see errors even when the code is used in environments where `@react-navigation/native` is not used.
 * Focus is read as an external store snapshot so changes between rendering and subscription are observed.
 *
 * @returns {boolean} - Returns the focus state of the current screen.
 * @example
 * ```typescript
 *  const isFocused = useIsFocusedSafely();
 *  console.log(isFocused); // true or false
 * ```
 */
export function useIsFocusedSafely(): boolean {
  const navigation = useNavigationSafely();
  const getSnapshot = useCallback(() => navigation?.isFocused() ?? true, [navigation]);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribeFocus = navigation?.addListener('focus', onStoreChange);
      const unsubscribeBlur = navigation?.addListener('blur', onStoreChange);

      return () => {
        unsubscribeFocus?.();
        unsubscribeBlur?.();
      };
    },
    [navigation]
  );

  const isFocused = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useDebugValue(isFocused);

  return isFocused;
}
