import { useNavigationState } from '@granite-js/native/@react-navigation/native';

export function useIsInitialScreen() {
  const index = useNavigationState((state) => state?.index ?? 0);

  return index === 0;
}
