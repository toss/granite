import { SafeAreaProvider } from '@granite-js/native/react-native-safe-area-context';
import type { ComponentType, PropsWithChildren } from 'react';
import type { InitialProps } from '../initial-props';
import { Router, type InternalRouterProps } from '../router';
import { BackEventProvider } from '../use-back-event';
import { App } from './App';
import type { GraniteProps } from './Granite';
import { getSchemePrefix } from '../utils/getSchemePrefix';
import { InitialPropsProvider } from './context/InitialPropsContext';

/**
 * @internal
 */
interface AppRootProps extends GraniteProps {
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
  initialScheme: string;
  setIosSwipeGestureEnabled?: ({ isEnabled }: { isEnabled: boolean }) => void;
  getInitialUrl: InternalRouterProps['getInitialUrl'];
}

export function AppRoot({
  appName,
  context,
  container: Container,
  initialProps,
  initialScheme,
  router,
  setIosSwipeGestureEnabled,
  getInitialUrl,
}: AppRootProps) {
  const prefix = getSchemePrefix({
    appName,
    scheme: global.__granite.app.scheme,
    host: global.__granite.app.host,
  });

  return (
    <InitialPropsProvider initialProps={initialProps}>
      <App {...initialProps}>
        <SafeAreaProvider>
          <BackEventProvider>
            <Router
              context={context}
              initialProps={initialProps}
              initialScheme={initialScheme}
              container={Container}
              prefix={prefix}
              setIosSwipeGestureEnabled={setIosSwipeGestureEnabled}
              getInitialUrl={getInitialUrl}
              {...router}
            />
          </BackEventProvider>
        </SafeAreaProvider>
      </App>
    </InitialPropsProvider>
  );
}
