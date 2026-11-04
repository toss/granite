import {
  NavigationContainerRefContext,
  NavigationContext,
  NavigationProp,
} from '@granite-js/native/@react-navigation/native';
import { useContext } from 'react';

/**
 * @name useNavigationSafely
 * @category Hooks
 * @kind function
 * @link https://github.com/react-navigation/react-navigation/blob/d1cd940d9a3fb46bec0eb6bf4f8023789fc93b28/packages/core/src/useNavigation.tsx#L13
 * @description
 * A Hook that safely uses [`useNavigation`](https://reactnavigation.org/docs/use-navigation/) from `@react-navigation/native` for managing navigation between screens.
 * This Hook is based on `useNavigation` provided by `@react-navigation/native`, but operates more safely by not throwing errors when `navigation` or `root` objects are `null` or `undefined`.
 * It also ensures the code runs safely in environments where `@react-navigation/native` is not used, preventing users from experiencing errors.
 *
 * @returns {NavigationProp<ReactNavigation.RootParamList> | undefined} - The screen is in a visible state.
 * @example
 * ```typescript
 *  const navigation = useNavigationSafely();
 *  const isNavigationFocused = () => navigation?.isFocused() ?? true;
 * ```
 */
export function useNavigationSafely(): NavigationProp<ReactNavigation.RootParamList> | undefined {
  const root = useContext(NavigationContainerRefContext);
  const navigation = useContext(NavigationContext);

  return (navigation ?? root ?? undefined) as NavigationProp<ReactNavigation.RootParamList> | undefined;
}
