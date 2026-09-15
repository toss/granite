import { type EffectCallback, useEffect } from 'react';
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

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    return effect();
  }, [effect, isVisible]);
}
