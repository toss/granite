import type { InitialProps } from '@granite-js/react-native';
import ShowcaseApp from './_app';

type ServiceProps = {
  readonly initialProps: InitialProps;
  readonly session: {
    readonly url: string;
  };
};

export default function Service({ initialProps, session }: ServiceProps) {
  return <ShowcaseApp {...initialProps} scheme={session.url} />;
}
