import { Bedrock, type InitialProps } from '@granite-js/react-native';
import React from 'react';
import { context } from '../require.context';

function AppContainer({ children }: InitialProps) {
  return <>{children}</>;
}

export default Bedrock.registerApp(AppContainer, { context, appName: 'bare' });
