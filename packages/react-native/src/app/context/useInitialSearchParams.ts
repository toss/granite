import { useInitialProps } from './InitialPropsContext';

export function useInitialSearchParams() {
  const scheme = useInitialProps().scheme ?? '';
  try {
    return Object.fromEntries(new URL(scheme).searchParams);
  } catch {
    return {};
  }
}
