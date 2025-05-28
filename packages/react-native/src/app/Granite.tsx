import { SafeAreaProvider } from '@granite-js/native/react-native-safe-area-context';
import { ComponentType, PropsWithChildren } from 'react';
import { App } from './App';
import { registerPage } from './registerPage';
import type { InitialProps } from '../initial-props';
import { Router, type RouterProps, type RequireContext } from '../router';
import { BackEventProvider, useBackEventState } from '../use-back-event';

export interface GraniteProps {
  /**
   * @description
   * The name of the app.
   */
  appName: string;
  /**
   * @description
   * The context of the app.
   *
   * @TODO Hide context
   */
  context: RequireContext;
  /**
   * @description
   * Configuration object to be passed to the router.
   */
  router?: RouterProps;
}

/**
 * @internal
 */
interface AppRootProps extends GraniteProps {
  container: ComponentType<PropsWithChildren<InitialProps>>;
  initialProps: InitialProps;
}

const scheme = global.__granite.app.scheme;

function AppRoot({ appName, context, container, initialProps, router }: AppRootProps) {
  const backEventState = useBackEventState();
  const baseScheme = `${scheme}://${appName}`;

  return (
    <App {...initialProps}>
      <SafeAreaProvider>
        <BackEventProvider backEvent={backEventState}>
          <Router
            context={context}
            initialProps={initialProps}
            container={container}
            canGoBack={!backEventState.hasBackEvent}
            onBack={backEventState.onBack}
            prefix={baseScheme}
            {...router}
          />
        </BackEventProvider>
      </SafeAreaProvider>
    </App>
  );
}

const createApp = () => {
  let _appName: string | null = null;

  return {
    registerApp(
      AppContainer: ComponentType<PropsWithChildren<InitialProps>>,
      { appName, context, router }: GraniteProps
    ): (initialProps: InitialProps) => JSX.Element {
      function Root(initialProps: InitialProps) {
        return (
          <AppRoot
            container={AppContainer}
            initialProps={initialProps}
            appName={appName}
            context={context}
            router={router}
          />
        );
      }

      registerPage(Root);
      _appName = appName;
      return Root;
    },

    get appName(): string {
      if (_appName === null) {
        throw new Error('Granite.appName can only be used after registerApp has been called.');
      }
      return _appName;
    },
  };
};

/**
 * @public
 * @category Core
 * @name Granite
 * @description
 *
 * @property {RegisterService} registerApp - This function sets up the basic environment for your service and helps you start service development quickly without needing complex configuration. By just passing `appName`, you can immediately use various features such as file-based routing, query parameter handling, and back navigation control.
 *
 * The features provided by the `Granite.registerApp` function are as follows:
 * - Routing: URLs are automatically mapped according to file paths. It works similarly to Next.js's file-based routing. For example, the `/my-service/pages/index.ts` file can be accessed at `scheme://my-service`, and the `/my-service/pages/home.ts` file can be accessed at `scheme://my-service/home`.
 * - Query Parameters: You can easily use query parameters received through URL schemes. For example, you can receive a `referrer` parameter and log it.
 * - Back Navigation Control: You can control back navigation events. For example, when a user presses back on a screen, you can show a dialog or close the screen.
 * - Screen Visibility: You can determine whether a screen is visible or hidden from the user. For example, you can use this value to handle specific actions when a user leaves for the home screen.
 *
 * @example
 *
 * ### Example of creating with the `Granite` component
 *
 * ```tsx
 * import { PropsWithChildren } from 'react';
 * import { Granite, InitialProps } from '@granite-js/react-native';
 * import { context } from '../require.context';
 *
 * function AppContainer({ children }: PropsWithChildren<InitialProps>) {
 *  return <>{children}</>;
 * }
 *
 * export default Granite.registerApp(AppContainer, {
 *  appName: 'my-app',
 *  context,
 * });
 *
 * ```
 */
export const Granite = createApp();
