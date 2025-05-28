import { useDebugValue, useEffect, useState } from 'react';
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
  const isNavigationFocused = () => navigation?.isFocused() ?? true;

  const [isFocused, setIsFocused] = useState(isNavigationFocused());

  const valueToReturn = isNavigationFocused();

  if (isFocused !== valueToReturn) {
    // If the value has changed since the last render, we need to update it.
    // This could happen if we missed an update from the event listeners during re-render.
    // React will process this update immediately, so the old subscription value won't be committed.
    // It is still nice to avoid returning a mismatched value though, so let's override the return value.
    // This is the same logic as in https://github.com/facebook/react/tree/master/packages/use-subscription
    setIsFocused(valueToReturn);
  }

  useEffect(() => {
    if (navigation == null) {
      return;
    }

    const unsubscribeFocus = navigation.addListener('focus', () => setIsFocused(true));

    const unsubscribeBlur = navigation.addListener('blur', () => setIsFocused(false));

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useDebugValue(valueToReturn);

  return valueToReturn;
}
