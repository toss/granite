import { Platform } from 'react-native';

export function useInitialRouteName({ prefix, initialScheme }: { prefix: string; initialScheme?: string }) {
  if (!initialScheme) {
    return '/';
  }

  const pathname = removeTrailingSlash(initialScheme).slice(prefix.length).split('?')[0];
  const shouldUseIndex = pathname?.length === 0;

  return shouldUseIndex ? '/' : pathname;
}

function removeTrailingSlash(scheme: string) {
  if (Platform.OS === 'android') {
    return scheme.replaceAll(/\/+$/g, '');
  }

  return scheme;
}
