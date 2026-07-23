import { Granite, type InitialProps } from '@granite-js/react-native';
import type { PropsWithChildren } from 'react';
import { context } from '../require.context';

const APP_NAME = 'bare';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return <>{children}</>;
}

export default Granite.registerApp(AppContainer, {
  context,
  appName: APP_NAME,
});
