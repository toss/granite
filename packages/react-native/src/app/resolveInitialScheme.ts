import type { InitialProps } from '../initial-props';

export function resolveInitialScheme(
  initialScheme: string | (() => string) | undefined,
  initialProps: InitialProps,
  getFallbackScheme: () => string
): string {
  const configuredScheme = typeof initialScheme === 'function' ? initialScheme() : initialScheme;
  return configuredScheme ?? initialProps.scheme ?? getFallbackScheme();
}
