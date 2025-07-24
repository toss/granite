import type { ComponentType, PropsWithChildren } from 'react';
import type { InitialProps } from '../initial-props';
import { App } from './App';

/**
 * @internal
 */
interface HostAppRootProps {
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
}

export function HostAppRoot({ container: Container, initialProps }: HostAppRootProps) {
  return (
    <App {...initialProps}>
      <Container {...initialProps} />
    </App>
  );
}
