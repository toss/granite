/**
 * @public
 * @category UI
 * @name ColorPreference
 * @description
 * Type representing the color mode of the current device. It is a string representing light mode and dark mode.
 *
 * @typedef {'light' | 'dark'} ColorPreference
 */
export type ColorPreference = 'light' | 'dark';

/**
 * @category Types
 * @name BaseInitialProps
 * @description
 * Interface representing the base initial properties.
 *
 * @interface
 * @property {'ios' | 'android'} platform - Platform type
 * @property {ColorPreference} initialColorPreference - Initial color
 * @property {string} [scheme] - Executed scheme
 */
type BaseInitialProps = {
  platform: 'ios' | 'android';
  initialColorPreference: ColorPreference;
  scheme?: string;
};

/**
 * @category Types
 * @name AndroidInitialProps
 * @description
 * Values passed from Android to React Native.
 *
 * @interface
 * @augments BaseInitialProps
 * @property {'android'} platform - Platform name (Android)
 */
export type AndroidInitialProps = BaseInitialProps & {
  platform: 'android';
};

/**
 * @category Types
 * @name IOSInitialProps
 * @description
 * Interface representing iOS initial properties.
 *
 * @interface
 * @augments BaseInitialProps
 * @property {'ios'} platform - Platform (iOS)
 */
export type IOSInitialProps = BaseInitialProps & {
  platform: 'ios';
};

/**
 * @public
 * @category Core
 * @name InitialProps
 * @description
 * Provides the initial data type that native platforms (Android/iOS) pass to the app when a user enters a specific screen in a React Native app.
 * The initial data contains important information used for screen initialization, and the required data types differ by native platform.
 *
 * The data type provided by Android is `AndroidInitialProps`, and the data type provided by iOS is `IOSInitialProps`.
 *
 * @property {'ios' | 'android'} platform - The platform on which the app is currently running. Has a value of either `ios` or `android`.
 * @property {ColorPreference} initialColorPreference - The initial color theme. Represents the color theme set by the user.
 * @property {string} [scheme] - The URL scheme used to enter the current screen.
 *
 * @example
 *
 * ### Example using `InitialProps`
 *
 * ::: code-group
 * ```tsx [_app.tsx]
 * import { PropsWithChildren } from 'react';
 * import { Granite, InitialProps } from '@granite-js/react-native';
 * import { context } from '../require.context';
 *
 * const APP_NAME = 'my-app-name';
 *
 * function AppContainer({ children, ...initialProps }: PropsWithChildren<InitialProps>) {
 *   console.log({ initialProps });
 *   return <>{children}</>;
 * }
 *
 * export default Granite.registerApp(AppContainer, {
 *   appName: APP_NAME,
 *   context,
 * });
 * ```
 * :::
 */
export type InitialProps = AndroidInitialProps | IOSInitialProps;
