import { useEffect } from 'react';
import { useVisibility } from './useVisibility';
import { usePrevious } from './utils/usePrevious';

/**
 * String representing whether the screen is visible.
 * @typedef {string} VisibilityState
 * @property {'visible'} visible - The screen is visible.
 * @property {'hidden'} hidden - The screen is not visible.
 */
export type VisibilityState = 'visible' | 'hidden';

/**
 * @callback VisibilityCallback
 * @param {VisibilityState} state - String representing the visibility state of the screen.
 */
export type VisibilityCallback = (state: VisibilityState) => void;

/**
 * @public
 * @category Screen Control
 * @name useVisibilityChange
 * @kind function
 * @description
 * Calls a callback function with the visibility state when the screen's visibility changes.
 * The callback function receives the return value from [useVisibility](/en/reference/react-native/Screen%20Control/useVisibility). If the return value is `true`, it passes 'visible', and if `false`, it passes 'hidden'.
 *
 * @param {VisibilityCallback} callback - Calls a callback function that receives visibility changes when the screen's visibility changes.
 * @example
 *
 * ### Example of logging when screen visibility changes
 *
 * ```tsx
 * import { useState } from 'react';
 * import { Text, View } from 'react-native';
 * import { useVisibilityChange, VisibilityState } from '@granite-js/react-native';
 *
 * export function UseVisibilityChangeExample() {
 *   const [visibilityHistory, setVisibilityHistory] = useState<VisibilityState[]>([]);
 *
 *   useVisibilityChange((visibility) => {
 *     setVisibilityHistory((prev) => [...prev, visibility]);
 *   });
 *
 *   return (
 *     <View>
 *       <Text>Logs are created when leaving and returning to the home screen.</Text>
 *
 *       {visibilityHistory.map((visibility, index) => (
 *         <Text key={index}>{JSON.stringify(visibility)}</Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useVisibilityChange(callback: VisibilityCallback) {
  const isVisible = useVisibility();

  const prevValue = usePrevious<boolean>(isVisible) ?? false;

  useEffect(() => {
    if (prevValue === isVisible) {
      return;
    }

    callback(isVisible ? 'visible' : 'hidden');
  }, [callback, isVisible, prevValue]);
}
