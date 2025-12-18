import { type ViewProps, type ColorValue } from 'react-native';
import type { WithDefault, Int32, DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// Event payload types
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type OnLoadStartEvent = Readonly<{}>;

export type OnProgressEvent = Readonly<{
  loaded: Int32;
  total: Int32;
}>;

export type OnLoadEvent = Readonly<{
  width: Int32;
  height: Int32;
}>;

export type OnErrorEvent = Readonly<{
  error: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type OnLoadEndEvent = Readonly<{}>;

export interface GraniteImageProps extends ViewProps {
  // Source
  uri?: string;
  headers?: string; // JSON string of headers object

  // Display
  contentMode?: WithDefault<'cover' | 'contain' | 'stretch' | 'center', 'cover'>;
  tintColor?: ColorValue;

  // Placeholder
  defaultSource?: string; // Local asset name or URI
  fallbackSource?: string; // Fallback image to show on error

  // Priority & Cache
  priority?: WithDefault<'low' | 'normal' | 'high', 'normal'>;
  cachePolicy?: WithDefault<'memory' | 'disk' | 'none', 'disk'>;

  // Callbacks
  onGraniteLoadStart?: DirectEventHandler<OnLoadStartEvent>;
  onGraniteProgress?: DirectEventHandler<OnProgressEvent>;
  onGraniteLoad?: DirectEventHandler<OnLoadEvent>;
  onGraniteError?: DirectEventHandler<OnErrorEvent>;
  onGraniteLoadEnd?: DirectEventHandler<OnLoadEndEvent>;
}

export default codegenNativeComponent<GraniteImageProps>('GraniteImage');
