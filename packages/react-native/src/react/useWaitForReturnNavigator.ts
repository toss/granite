import { useNavigation } from '@granite-js/native/@react-navigation/native';
import { NativeStackNavigationProp } from '@granite-js/native/@react-navigation/native-stack';
import { useCallback, useRef } from 'react';
import { useVisibilityChange, type VisibilityState } from '../visibility';

/**
 * @public
 * @category Screen Control
 * @name useWaitForReturnNavigator
 * @description
 * A Hook that helps execute the next code synchronously when returning from a screen transition.
 * Screen navigation uses [@react-navigation/native `useNavigation`'s `navigate`](https://reactnavigation.org/docs/6.x/navigation-prop#navigate).
 *
 * For example, it can be used when you want to log that a user has navigated to another screen and returned.
 *
 * @example
 * ### Example of code execution when returning from screen navigation
 *
 * When the **"Navigate"** button is pressed, it navigates to another screen, and logs are created when returning.
 *
 * ```tsx
 * import { Button } from 'react-native';
 * import { useWaitForReturnNavigator } from '@granite-js/react-native';
 *
 * export function UseWaitForReturnNavigator() {
 *   const navigate = useWaitForReturnNavigator();
 *
 *   return (
 *     <>
 *       <Button
 *         title="Navigate"
 *         onPress={async () => {
 *           console.log(1);
 *           await navigate('/examples/use-visibility');
 *           // This code executes when returning to the screen
 *           console.log(2);
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

export function useWaitForReturnNavigator<T extends Record<string, object | undefined>>() {
  const callbacks = useRef<Array<() => void>>([]).current;
  const navigation = useNavigation<NativeStackNavigationProp<T>>();

  const startNavigating = useCallback(
    <RouteName extends keyof T>(route: RouteName, params?: T[RouteName]): Promise<void> => {
      return new Promise<void>((resolve) => {
        callbacks.push(resolve);
        navigation.navigate(route as any, params as any);
      });
    },
    [callbacks, navigation]
  );

  const handleVisibilityChange = useCallback(
    (state: VisibilityState) => {
      if (state === 'visible' && callbacks.length > 0) {
        for (const callback of callbacks) {
          callback();
        }

        callbacks.splice(0, callbacks.length);
      }
    },
    [callbacks]
  );

  useVisibilityChange(handleVisibilityChange);

  return startNavigating;
}
