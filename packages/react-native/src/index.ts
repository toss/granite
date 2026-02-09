import './types/global';

export { Granite, useInitialSearchParams, useInitialProps } from './app';
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
export * from './router/createRoute';
export * from './router/hooks/useIsInitialScreen';
export * from './event';
export * from './video';
export * from './status-bar';
export * from '@granite-js/blur-view';

export { BackButton, useRouterBackHandler } from './router';

export type { InitialProps, ColorPreference } from './initial-props';
export type { GraniteProps } from './app';
