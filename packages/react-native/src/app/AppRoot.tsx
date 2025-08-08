import { SafeAreaProvider } from '@granite-js/native/react-native-safe-area-context';
import type { ComponentType, PropsWithChildren } from 'react';
import type { InitialProps } from '../initial-props';
import { Router } from '../router';
import { BackEventProvider, useBackEventState } from '../use-back-event';
import { App } from './App';
import type { GraniteProps } from './Granite';
import { getSchemePrefix } from '../utils/getSchemePrefix';

/**
 * @internal
 */
interface AppRootProps extends GraniteProps {
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
  initialScheme: string;
}

export function AppRoot({ appName, context, container: Container, initialProps, initialScheme, router }: AppRootProps) {
  const backEventState = useBackEventState();

  const prefix = getSchemePrefix({
    appName,
    scheme: global.__granite.app.scheme,
    host: global.__granite.app.host,
  });

  return (
    <App {...initialProps}>
      <SafeAreaProvider>
        <BackEventProvider backEvent={backEventState}>
          <Router
            context={context}
            initialProps={initialProps}
            initialScheme={initialScheme}
            container={Container}
            prefix={prefix}
            {...router}
          />
        </BackEventProvider>
      </SafeAreaProvider>
    </App>
  );
}
