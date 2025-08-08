import { SafeAreaProvider } from '@granite-js/native/react-native-safe-area-context';
import type { ComponentType, PropsWithChildren } from 'react';
import type { InitialProps } from '../initial-props';
import { Router } from '../router';
import { BackEventProvider, useBackEventState } from '../use-back-event';
import { App } from './App';
import type { GraniteProps } from './Granite';

/**
 * @internal
 */
interface AppRootProps extends GraniteProps {
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
}

export function AppRoot({ appName, context, container: Container, initialProps, router }: AppRootProps) {
  const backEventState = useBackEventState();
  const scheme = global.__granite.app.scheme;
  const baseScheme = `${scheme}://${appName}`;

  return (
    <App {...initialProps}>
      <SafeAreaProvider>
        <BackEventProvider backEvent={backEventState}>
          <Router context={context} initialProps={initialProps} container={Container} prefix={baseScheme} {...router} />
        </BackEventProvider>
      </SafeAreaProvider>
    </App>
  );
}
