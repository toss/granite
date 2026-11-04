import { VisibilityProvider } from '../../visibility/VisibilityProvider';
import { Props } from '.';

export function App({ children }: Props) {
  return <VisibilityProvider isVisible={true}>{children}</VisibilityProvider>;
}
