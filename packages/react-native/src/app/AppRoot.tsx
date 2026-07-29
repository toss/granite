import { SafeAreaProvider, initialWindowMetrics } from '@granite-js/native/react-native-safe-area-context';
import type { ComponentType, PropsWithChildren } from 'react';
import { Dimensions } from 'react-native';
import type { InitialProps } from '../initial-props';
import { Router, type InternalRouterProps } from '../router';
import { BackEventProvider } from '../use-back-event';
import { App } from './App';
import type { GraniteProps } from './Granite';
import { useServiceSession } from './ServiceSessionContext';
import { getSchemePrefix } from '../utils/getSchemePrefix';
import { InitialPropsProvider } from './context/InitialPropsContext';
import type { AppEnvironment } from './resolveAppEnvironment';

/**
 * @internal
 */
interface AppRootProps extends GraniteProps {
  appEnvironment: AppEnvironment;
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
  initialScheme: string;
  setIosSwipeGestureEnabled?: ({ isEnabled }: { isEnabled: boolean }) => void;
  setiOSBackPressHandler?: ({ handler }: { handler: () => void }) => Promise<void> | void;
  getInitialUrl: InternalRouterProps['getInitialUrl'];
}

export function AppRoot({
  appEnvironment,
  appName,
  context,
  container: Container,
  initialProps,
  initialScheme,
  router,
  setIosSwipeGestureEnabled,
  setiOSBackPressHandler,
  getInitialUrl,
}: AppRootProps) {
  const serviceSession = useServiceSession();
  const prefix = getSchemePrefix({
    appName,
    scheme: appEnvironment.scheme,
    host: appEnvironment.host,
  });
  const window = Dimensions.get('window');
  const serviceInitialMetrics =
    serviceSession == null
      ? undefined
      : (initialWindowMetrics ?? {
          frame: { x: 0, y: 0, width: window.width, height: window.height },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        });

  return (
    <InitialPropsProvider initialProps={initialProps}>
      <App {...initialProps}>
        <SafeAreaProvider initialMetrics={serviceInitialMetrics}>
          <BackEventProvider>
            <Router
              context={context}
              initialProps={initialProps}
              initialScheme={initialScheme}
              container={Container}
              prefix={prefix}
              setIosSwipeGestureEnabled={setIosSwipeGestureEnabled}
              setiOSBackPressHandler={setiOSBackPressHandler}
              getInitialUrl={getInitialUrl}
              {...router}
            />
          </BackEventProvider>
        </SafeAreaProvider>
      </App>
    </InitialPropsProvider>
  );
}
