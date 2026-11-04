import type { ComponentType, PropsWithChildren } from 'react';
import type { InitialProps } from '../initial-props';
import { App } from './App';
import { InitialPropsProvider } from './context/InitialPropsContext';

interface AppRootProps {
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
}

export function AppRoot({ container: Container, initialProps }: AppRootProps) {
  return (
    <InitialPropsProvider initialProps={initialProps}>
      <App {...initialProps}>
        <Container {...initialProps} />
      </App>
    </InitialPropsProvider>
  );
}
