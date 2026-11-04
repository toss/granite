import './types/global';

export { Granite, InitialPropsProvider, useInitialSearchParams, useInitialProps } from './app';
export * from '@granite-js/style-utils';
export {
  type GraniteImageSource,
  type GraniteImageStatic,
  type ResizeMode,
  type CachePolicy,
  type Priority,
  type OnLoadEvent,
  type OnProgressEvent,
} from '@granite-js/native/react-native-fast-image';

// Image with SVG support
export * from './image';
export * from './lottie';

export * from './dev-entrypoint';
export * from './native-modules/natives';
export * from './visibility';
export * from './use-back-event';
export * from './keyboard';
export * from './intersection-observer';
export * from './impression-area';
export * from './scroll-view-inertial-background';
export * from '@granite-js/router';
export * from './event';
export * from './video';
export * from './status-bar';
export * from '@granite-js/blur-view';

export { Router, BackButton, useRouterBackHandler } from './router';

export type { InitialProps, ColorPreference } from './initial-props';
export type { GraniteProps } from './app';

export type { RouterProps } from './router';

// Keep declarations emitted by earlier route generators connected to the owning package.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RegisterScreenInput {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RegisterScreen {}
type LegacyRegisterScreenInput = RegisterScreenInput;
type LegacyRegisterScreen = RegisterScreen;
declare module '@granite-js/router' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RegisterScreenInput extends LegacyRegisterScreenInput {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RegisterScreen extends LegacyRegisterScreen {}
}
