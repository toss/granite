import React, { useCallback } from 'react';
import {
  type StyleProp,
  type ViewStyle,
  type ColorValue,
  type ImageRequireSource,
  NativeModules,
  ViewProps,
} from 'react-native';
import GraniteImageNativeComponent, {
  type OnLoadStartEvent,
  type OnProgressEvent,
  type OnLoadEvent,
  type OnErrorEvent,
  type OnLoadEndEvent,
} from './GraniteImageNativeComponent';

const { GraniteImageModule } = NativeModules;

type WithNativeEvent<T extends object> = T & { nativeEvent: T };

const withNativeEvent = <T extends object>(nativeEvent: T): WithNativeEvent<T> => ({
  ...nativeEvent,
  nativeEvent,
});

// Source types matching GraniteImage
export interface GraniteImageSource {
  uri: string;
  headers?: Record<string, string>;
  priority?: 'low' | 'normal' | 'high';
  cache?: 'immutable' | 'web' | 'cacheOnly';
}

export type ResizeMode = 'cover' | 'contain' | 'stretch' | 'center';
export type CachePolicy = 'memory' | 'disk' | 'none';
export type Priority = 'low' | 'normal' | 'high';

export interface OnLoadEventData {
  width: number;
  height: number;
}

export interface OnProgressEventData {
  loaded: number;
  total: number;
}

export interface GraniteImageProps extends ViewProps {
  // Source - can be string URI or source object
  source: GraniteImageSource | string;

  // Display
  resizeMode?: ResizeMode;
  tintColor?: ColorValue;
  style?: StyleProp<ViewStyle>;

  // Placeholder
  defaultSource?: ImageRequireSource | string;

  // Fallback on error
  fallbackSource?: ImageRequireSource | string;

  // Priority & Cache
  priority?: Priority;
  cachePolicy?: CachePolicy;

  // Callbacks
  onLoadStart?: (event: WithNativeEvent<OnLoadStartEvent>) => void;
  onProgress?: (event: WithNativeEvent<OnProgressEventData>) => void;
  onLoad?: (event: WithNativeEvent<OnLoadEventData>) => void;
  onError?: (error: WithNativeEvent<OnErrorEvent>) => void;
  onLoadEnd?: (event: WithNativeEvent<OnLoadEndEvent>) => void;
}

// Map resizeMode to contentMode for native
const resizeModeToContentMode = (resizeMode?: ResizeMode): 'cover' | 'contain' | 'stretch' | 'center' => {
  return resizeMode || 'cover';
};

// Map GraniteImage cache to native cachePolicy
const mapCachePolicy = (cache?: 'immutable' | 'web' | 'cacheOnly'): CachePolicy => {
  switch (cache) {
    case 'cacheOnly':
      return 'disk';
    case 'web':
      return 'none';
    case 'immutable':
    default:
      return 'disk';
  }
};

// Type declarations for static methods
export interface GraniteImageStatic {
  clearMemoryCache: () => Promise<void>;
  clearDiskCache: () => Promise<void>;
  preload: (sources: GraniteImageSource[]) => Promise<void>;
}

type GraniteImageComponent = React.FC<GraniteImageProps> & GraniteImageStatic;

// Static methods for cache management
const clearMemoryCache = (): Promise<void> => {
  if (GraniteImageModule?.clearMemoryCache) {
    return GraniteImageModule.clearMemoryCache();
  }
  console.warn('GraniteImage.clearMemoryCache: Native module not available');
  return Promise.resolve();
};

const clearDiskCache = (): Promise<void> => {
  if (GraniteImageModule?.clearDiskCache) {
    return GraniteImageModule.clearDiskCache();
  }
  console.warn('GraniteImage.clearDiskCache: Native module not available');
  return Promise.resolve();
};

const preload = (sources: GraniteImageSource[]): Promise<void> => {
  if (GraniteImageModule?.preload) {
    const sourcesJson = JSON.stringify(sources);
    return GraniteImageModule.preload(sourcesJson);
  } else {
    console.warn('GraniteImage.preload: Native module not available');
    return Promise.resolve();
  }
};

const GraniteImageBase: React.FC<GraniteImageProps> = ({
  source,
  resizeMode = 'cover',
  tintColor,
  style,
  defaultSource,
  fallbackSource,
  priority = 'normal',
  cachePolicy = 'disk',
  onLoadStart,
  onProgress,
  onLoad,
  onError,
  onLoadEnd,
  testID,
}) => {
  // Parse source
  const uri = typeof source === 'string' ? source : ((source && typeof source === 'object' ? source.uri : '') ?? '');
  const headers = typeof source === 'object' && source.headers ? JSON.stringify(source.headers) : undefined;
  const sourcePriority = typeof source === 'object' ? source.priority : undefined;
  const sourceCache = typeof source === 'object' ? source.cache : undefined;

  // Handle defaultSource
  const defaultSourceUri =
    typeof defaultSource === 'string'
      ? defaultSource
      : typeof defaultSource === 'number'
        ? undefined // Local require() - need native handling
        : undefined;

  // Handle fallbackSource
  const fallbackSourceUri =
    typeof fallbackSource === 'string'
      ? fallbackSource
      : typeof fallbackSource === 'number'
        ? undefined // Local require() - need native handling
        : undefined;

  // Event handlers
  const handleLoadStart = useCallback(
    (event: { nativeEvent: OnLoadStartEvent }) => {
      onLoadStart?.(withNativeEvent(event.nativeEvent));
    },
    [onLoadStart]
  );

  const handleProgress = useCallback(
    (event: { nativeEvent: OnProgressEvent }) => {
      onProgress?.(withNativeEvent(event.nativeEvent));
    },
    [onProgress]
  );

  const handleLoad = useCallback(
    (event: { nativeEvent: OnLoadEvent }) => {
      onLoad?.(withNativeEvent(event.nativeEvent));
    },
    [onLoad]
  );

  const handleError = useCallback(
    (event: { nativeEvent: OnErrorEvent }) => {
      onError?.(withNativeEvent(event.nativeEvent));
    },
    [onError]
  );

  const handleLoadEnd = useCallback(
    (event: { nativeEvent: OnLoadEndEvent }) => {
      onLoadEnd?.(withNativeEvent(event.nativeEvent));
    },
    [onLoadEnd]
  );

  return (
    <GraniteImageNativeComponent
      uri={uri}
      headers={headers}
      contentMode={resizeModeToContentMode(resizeMode)}
      tintColor={tintColor}
      defaultSource={defaultSourceUri}
      fallbackSource={fallbackSourceUri}
      priority={sourcePriority || priority}
      cachePolicy={sourceCache ? mapCachePolicy(sourceCache) : cachePolicy}
      style={style}
      testID={testID}
      onGraniteLoadStart={onLoadStart ? handleLoadStart : undefined}
      onGraniteProgress={onProgress ? handleProgress : undefined}
      onGraniteLoad={onLoad ? handleLoad : undefined}
      onGraniteError={onError ? handleError : undefined}
      onGraniteLoadEnd={onLoadEnd ? handleLoadEnd : undefined}
    />
  );
};

export const GraniteImage: GraniteImageComponent = Object.assign(GraniteImageBase, {
  clearMemoryCache,
  clearDiskCache,
  preload,
});

export default GraniteImage;
