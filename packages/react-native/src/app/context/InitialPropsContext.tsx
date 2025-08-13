import { createContext, useContext, type PropsWithChildren } from 'react';
import { InitialProps } from '../../initial-props';

export const InitialPropsContext = createContext<InitialProps | null>(null);

export function InitialPropsProvider({ children, initialProps }: PropsWithChildren<{ initialProps: InitialProps }>) {
  return <InitialPropsContext.Provider value={initialProps}>{children}</InitialPropsContext.Provider>;
}

export function useInitialProps() {
  const initialProps = useContext(InitialPropsContext);

  if (!initialProps) {
    throw new Error('InitialPropsContext not found');
  }

  return initialProps;
}
