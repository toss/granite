import type { InitialProps } from '@granite-js/react-native';
import BareApp from './_app';

type ServiceProps = {
  readonly initialProps: InitialProps;
  readonly session: {
    readonly url: string;
  };
};

export default function Service({ initialProps, session }: ServiceProps) {
  return <BareApp {...initialProps} scheme={session.url} />;
}
