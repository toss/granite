import React, { useMemo, useState } from 'react';
import { Image, type ImageProps, type ImageSourcePropType } from 'react-native';
import type { GraniteImageProps, GraniteImageSource, GraniteImageStatic } from './GraniteImage';

type GraniteImageComponent = React.FC<GraniteImageProps> & GraniteImageStatic;

function toImageSource(source: GraniteImageSource | string): ImageSourcePropType | undefined {
  if (typeof source === 'string') {
    return source ? { uri: source } : undefined;
  }

  if (!source?.uri) {
    return undefined;
  }

  return source.headers ? { uri: source.uri, headers: source.headers } : { uri: source.uri };
}

type OptionalSource = ImageProps['defaultSource'];

function toOptionalSource(value?: OptionalSource | string) {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return { uri: value };
  }

  return value;
}

const GraniteImageBase: React.FC<GraniteImageProps> = ({
  source,
  resizeMode,
  tintColor,
  style,
  defaultSource,
  fallbackSource,
  onLoadStart,
  onProgress: _onProgress,
  onLoad,
  onError,
  onLoadEnd,
  testID,
  ...rest
}) => {
  void _onProgress;
  const [hasError, setHasError] = useState(false);

  const primarySource = useMemo(() => toImageSource(source), [source]);
  const resolvedDefaultSource = useMemo(() => toOptionalSource(defaultSource), [defaultSource]);
  const resolvedFallbackSource = useMemo(() => toOptionalSource(fallbackSource), [fallbackSource]);

  const imageSource = hasError && resolvedFallbackSource ? resolvedFallbackSource : primarySource;

  if (!imageSource) {
    return null;
  }

  return (
    <Image
      {...rest}
      source={imageSource}
      defaultSource={resolvedDefaultSource}
      resizeMode={resizeMode}
      tintColor={tintColor as ImageProps['tintColor']}
      style={style as ImageProps['style']}
      testID={testID}
      onLoadStart={onLoadStart as ImageProps['onLoadStart']}
      onLoad={onLoad as ImageProps['onLoad']}
      onLoadEnd={onLoadEnd as ImageProps['onLoadEnd']}
      onError={(event) => {
        setHasError(true);
        onError?.(event as never);
      }}
    />
  );
};

export const GraniteImage: GraniteImageComponent = Object.assign(GraniteImageBase, {
  clearMemoryCache: async () => {},
  clearDiskCache: async () => {},
  preload: async () => {},
});

export default GraniteImage;
