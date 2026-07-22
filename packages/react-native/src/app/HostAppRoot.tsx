import type { ComponentType, PropsWithChildren } from 'react';
import type { InitialProps } from '../initial-props';
import { App } from './App';

/**
 * @internal
 */
interface HostAppRootProps<HostInitialProps extends InitialProps> {
  container: ComponentType<PropsWithChildren<HostInitialProps>>;
  initialProps: HostInitialProps;
}

export function HostAppRoot<HostInitialProps extends InitialProps>({
  container: Container,
  initialProps,
}: HostAppRootProps<HostInitialProps>) {
  return (
    <App {...initialProps}>
      <Container {...initialProps} />
    </App>
  );
}
