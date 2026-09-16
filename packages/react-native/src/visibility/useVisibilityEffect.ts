import { type EffectCallback, useEffect, useReducer } from 'react';
import { useNavigationSafely } from './react-navigation/useNavigationSafely';
import { useVisibility } from './useVisibility';

/**
 * @public
 * @category Screen Control
 * @name useVisibilityEffect
 * @description
 * Runs an effect while the screen is visible, using the visibility state from `useVisibility`.
 * Cleans up when the screen becomes hidden, the effect callback changes, or the component unmounts.
 * Like `useEffect`, setup and cleanup run after a render is committed. The callback must be synchronous
 * and may return a cleanup function. Use `useCallback` to avoid restarting on unrelated renders.
 * Unlike `useVisibilityChange`, a returned cleanup function is registered with React.
 * Effect ordering between different screens is not guaranteed; navigation events do not invoke this callback synchronously.
 *
 * @param {EffectCallback} effect - Sets up the effect and optionally returns its cleanup function.
 * @example
 * ```tsx
 * import { useCallback } from 'react';
 * import { BackHandler } from 'react-native';
 * import { useVisibilityEffect } from '@granite-js/react-native';
 *
 * function Screen({ onBack }: { onBack: () => boolean }) {
 *   useVisibilityEffect(
 *     useCallback(() => {
 *       const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
 *       return () => subscription.remove();
 *     }, [onBack])
 *   );
 *
 *   return null;
 * }
 * ```
 */
export function useVisibilityEffect(effect: EffectCallback): void {
  const isVisible = useVisibility();
  const navigation = useNavigationSafely();
  const [focusRetry, retryOnFocus] = useReducer((retry: number) => retry + 1, 0);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    // Focus may change after render, before this effect runs. If it returns before
    // the corrective render, isVisible can stay true, so explicitly retry setup.
    if (navigation?.isFocused() === false) {
      return navigation.addListener('focus', retryOnFocus);
    }

    return effect();
  }, [effect, isVisible, navigation, focusRetry]);
}
