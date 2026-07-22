import { expectTypeOf, it } from 'vitest';
import type { InitialProps } from '../initial-props';

declare const granite: typeof import('./Granite').Granite;

type HostInitialProps = InitialProps & {
  readonly hostSessionId: string;
};

function HostContainer(props: HostInitialProps) {
  return <>{props.hostSessionId}</>;
}

it('preserves host-specific initial props when registering a host app', () => {
  const registerHost = () => granite.registerHostApp(HostContainer, { appName: 'shared' });

  expectTypeOf(registerHost).returns.toEqualTypeOf<(initialProps: HostInitialProps) => React.JSX.Element>();
});
