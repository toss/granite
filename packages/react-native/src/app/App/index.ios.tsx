import { useMemo } from 'react';
import { VisibilityProvider } from '../../visibility';
import { Props } from '.';

type IOSInitialProps = Props & {
  isVisible: boolean;
};

export function App({ children, ...props }: IOSInitialProps) {
  const { isVisible } = useMemo(() => props, [props]);

  return <VisibilityProvider isVisible={isVisible}>{children}</VisibilityProvider>;
}
