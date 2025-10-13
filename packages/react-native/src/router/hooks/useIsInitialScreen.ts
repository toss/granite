import { useNavigationState } from '@granite-js/native/@react-navigation/native';

/**
 * Hook that determines if the current screen is the initial screen in the navigation stack.
 *
 * @returns {boolean} True if the current screen is the initial (first) screen in the stack, false otherwise.
 */
export function useIsInitialScreen() {
  const index = useNavigationState((state) => state?.index ?? 0);

  return index === 0;
}
