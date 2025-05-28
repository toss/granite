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
 * @name NetworkStatus
 * @description
 * Type representing the network status.
 *
 * @typedef {'WIFI' | '2G' | '3G' | '4G' | '5G' | 'UNKNOWN' | 'OFFLINE'} NetworkStatus
 */
type NetworkStatus = 'WIFI' | '2G' | '3G' | '4G' | '5G' | 'UNKNOWN' | 'OFFLINE';

/**
 * @category Types
 * @name BaseInitialProps
 * @description
 * Interface representing the base initial properties.
 *
 * @interface
 * @property {'ios' | 'android'} platform - Platform type
 * @property {string} appVersion - App version
 * @property {ColorPreference} initialColorPreference - Initial color
 * @property {NetworkStatus} networkStatus - Network status
 * @property {number} loadingStartTs - Timestamp when ReactNativeView started rendering in native
 * @property {string} [scheme] - Executed scheme
 */
type BaseInitialProps = {
  platform: 'ios' | 'android';
  appVersion: string;
  initialColorPreference: ColorPreference;
  networkStatus: NetworkStatus;
  loadingStartTs: number;
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
 * @property {string} initialFontScale - Font scale set on the device
 * @property {string} distributionGroup - Distribution group
 */
export type AndroidInitialProps = BaseInitialProps & {
  platform: 'android';
  initialFontScale: string;
  distributionGroup: string;
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
 * @property {IOSFontSizeType} initialFontSize - Initial font size
 * @property {boolean} isVisible - Visibility status
 */
export type IOSInitialProps = BaseInitialProps & {
  platform: 'ios';
  initialFontSize: IOSFontSizeType;
  isVisible: boolean;
};

/**
 * @category Types
 * @name IOSFontSizeType
 * @description
 * Type representing iOS font size type.
 *
 * @typedef {'xSmall' | 'Small' | 'Medium' | 'Large' | 'xLarge' | 'xxLarge' | 'xxxLarge' | 'A11y_Medium' | 'A11y_Large' | 'A11y_xLarge' | 'A11y_xxLarge' | 'A11y_xxxLarge'} IOSFontSizeType
 */
type IOSFontSizeType =
  | 'xSmall'
  | 'Small'
  | 'Medium'
  | 'Large'
  | 'xLarge'
  | 'xxLarge'
  | 'xxxLarge'
  | 'A11y_Medium'
  | 'A11y_Large'
  | 'A11y_xLarge'
  | 'A11y_xxLarge'
  | 'A11y_xxxLarge';

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
 * @property {NetworkStatus} networkStatus - The current device's network connection status and connected network.
 * @property {string} [scheme] - The URL scheme used to enter the current screen.
 * @property {`xSmall` | `Small` | `Medium` | `Large` | `xLarge` | `xxLarge` | `xxxLarge` | `A11y_Medium` | `A11y_Large` | `A11y_xLarge` | `A11y_xxLarge` | `A11y_xxxLarge`} initialFontSize (iOS only) iOS system font size. Each value represents a specific font size. Default value is `Large`.
 * @property {boolean} isVisible (iOS only) Whether the screen is currently visible in iOS. Initial value is passed as `true`.
 * @property {string} initialFontScale (Android only) Android system font scale. The font size scale adjusted by the user in Android device's accessibility settings. This value is multiplied by the base font size to determine the final font size.
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
 * :::
 * ```
 */
export type InitialProps = AndroidInitialProps | IOSInitialProps;
