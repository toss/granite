import { ComponentType, type JSX, PropsWithChildren } from 'react';
import { AppRegistry } from 'react-native';
import { ENTRY_BUNDLE_NAME } from '../constants';
import type { InitialProps } from '../initial-props';
import { AppRoot } from './AppRoot';
import { HostAppRoot } from './HostAppRoot';
import { setupPolyfills } from '../polyfills';
import { VisibilityChangedProvider } from '../visibility/useVisibilityChanged';

interface GraniteAppRuntimeProps {
  readonly presentationVisibility?: boolean;
}

type RegisteredAppProps = InitialProps & GraniteAppRuntimeProps;

export interface GraniteProps {
  /** The name registered with the native app registry. */
  appName: string;
}

const createApp = () => {
  let _appName: string | null = null;

  setupPolyfills();

  function registerComponent(appKey: string, component: React.ComponentType<any>): string {
    if (AppRegistry.getAppKeys().includes(appKey)) {
      // `AppRegistry.registerComponent` returns the app key.
      return appKey;
    }

    return AppRegistry.registerComponent(appKey, () => component);
  }

  return {
    registerApp(
      AppContainer: ComponentType<PropsWithChildren<InitialProps>>,
      options: GraniteProps
    ): (initialProps: RegisteredAppProps) => JSX.Element {
      const { appName } = options;
      if (Object.keys(options).some((key) => key !== 'appName')) {
        throw new Error(
          'Granite.registerApp only accepts appName. Render Router in your app and pass routing options to it.'
        );
      }
      if (appName === ENTRY_BUNDLE_NAME) {
        throw new Error(`Reserved app name 'shared' cannot be used`);
      }

      function Root({ presentationVisibility = true, ...initialProps }: RegisteredAppProps) {
        return (
          <VisibilityChangedProvider isVisible={presentationVisibility}>
            <AppRoot container={AppContainer} initialProps={initialProps} />
          </VisibilityChangedProvider>
        );
      }

      registerComponent(appName, Root);
      _appName = appName;

      return Root;
    },

    registerHostApp(
      AppContainer: ComponentType<PropsWithChildren<InitialProps>>,
      { appName }: Pick<GraniteProps, 'appName'>
    ): (initialProps: InitialProps) => React.JSX.Element {
      if (appName !== ENTRY_BUNDLE_NAME) {
        throw new Error(`Host appName must be 'shared'`);
      }

      function Root(initialProps: InitialProps) {
        return <HostAppRoot container={AppContainer} initialProps={initialProps} />;
      }

      registerComponent(appName, Root);
      _appName = appName;

      return Root;
    },

    get appName(): string {
      if (_appName === null) {
        throw new Error('Granite.appName can only be used after registerApp or registerHostApp has been called.');
      }
      return _appName;
    },
  };
};

/**
 * @public
 * @category Core
 * @name Granite
 * @description Registers an app with native initial props and visibility lifecycle.
 * Routing is optional: render Router explicitly inside the app when navigation is needed.
 * @example
 * ```tsx
 * import { Granite, type InitialProps } from '@granite-js/react-native/core';
 *
 * function App(props: InitialProps) {
 *   return <MyContent colorPreference={props.initialColorPreference} />;
 * }
 *
 * export default Granite.registerApp(App, { appName: 'my-app' });
 * ```
 */
export const Granite = createApp();
