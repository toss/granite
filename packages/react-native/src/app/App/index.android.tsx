import { VisibilityProvider } from '../../visibility';
import { Props } from '.';

export function App({ children }: Props) {
  return <VisibilityProvider isVisible={true}>{children}</VisibilityProvider>;
}
