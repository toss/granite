import { Granite, type InitialProps } from '@granite-js/react-native';
import React, { type PropsWithChildren } from 'react';
import { context } from '../require.context';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return <>{children}</>;
}

export default Granite.registerApp(AppContainer, { context, appName: 'showcase' });
