import { Platform } from 'react-native';
import { getSchemeUri } from '../../native-modules';

export function useInitialRouteName(prefix: string) {
  const initialScheme = getInitialScheme();
  const pathname = initialScheme?.slice(prefix.length).split('?')[0];
  const shouldUseIndex = initialScheme == null || pathname?.length === 0;

  return shouldUseIndex ? '/' : pathname;
}
function getInitialScheme() {
  const scheme = getSchemeUri();

  /**
   * Removes trailing '/' on Android.
   */
  if (Platform.OS === 'android') {
    return scheme?.replaceAll(/\/+$/g, '');
  }

  return scheme;
}
