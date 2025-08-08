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
  initialScheme: string;
}

export function AppRoot({ appName, context, container: Container, initialProps, initialScheme, router }: AppRootProps) {
  const backEventState = useBackEventState();
  const scheme = global.__granite.app.scheme;
  const host = global.__granite.app.host;
  const prefix = `${scheme}://${host.length > 0 ? `${host}/` : ''}${appName}`;

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
