import { createContext, useContext, type PropsWithChildren } from 'react';
import { InitialProps } from '../../initial-props';

export const InitialPropsContext = createContext<InitialProps | null>(null);

/**
 * @public
 * @name InitialPropsProvider
 * @category Core
 * @description Provides the initial data passed from the native platform (Android or iOS) to `useInitialProps` and `useInitialSearchParams`. `Granite.registerApp` already renders this provider, so you only need it when you register the root component yourself instead of going through the router.
 * @param {InitialProps} initialProps - Initial data the native platform passed to the root component.
 * @param {ReactNode | undefined} children - Child components that read the initial data.
 * @returns {ReactElement} A React Provider component.
 * @example
 *
 * ### Registering a root component without the router
 *
 * ```tsx
 * import { AppRegistry } from 'react-native';
 * import { InitialPropsProvider, type InitialProps } from '@granite-js/react-native';
 *
 * function App(initialProps: InitialProps) {
 *   return (
 *     <InitialPropsProvider initialProps={initialProps}>
 *       <MyApp />
 *     </InitialPropsProvider>
 *   );
 * }
 *
 * AppRegistry.registerComponent('my-app', () => App);
 * ```
 */
export function InitialPropsProvider({ children, initialProps }: PropsWithChildren<{ initialProps: InitialProps }>) {
  return <InitialPropsContext.Provider value={initialProps}>{children}</InitialPropsContext.Provider>;
}

/**
 * @public
 * @name useInitialProps
 * @category Core
 * @description Provides initial data passed from the native platform (Android or iOS) when entering a specific screen in React Native apps. This data can be used to immediately apply themes or user settings right after app launch. For example, you can receive dark mode settings from the native platform and apply dark mode immediately when the React Native app starts.
 * @returns {InitialProps} Initial data for the app
 * @example
 *
 * ### Checking dark mode status with initial data
 *
 * ```tsx
 * import { useInitialProps } from '@granite-js/react-native';
 *
 * function Page() {
 *   const initialProps = useInitialProps();
 *   // 'light' or 'dark'
 *   console.log(initialProps.initialColorPreference);
 *   return <></>;
 * }
 * ```
 */
export function useInitialProps<T extends InitialProps>() {
  const initialProps = useContext(InitialPropsContext);

  if (!initialProps) {
    throw new Error('InitialPropsContext not found');
  }

  return initialProps as T;
}
