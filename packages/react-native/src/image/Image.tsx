import GraniteImage, { GraniteImageProps, type GraniteImageSource } from '@granite-js/image';
import { StyleSheet } from 'react-native';
import { SvgImage } from './SvgImage';

type Source = {
  uri?: string;
  headers?: Record<string, string>;
  priority?: 'low' | 'normal' | 'high';
  cache?: 'immutable' | 'web' | 'cacheOnly';
};

export interface ImageProps extends Omit<GraniteImageProps, 'source' | 'onError'> {
  source?: Source;
  onError?: () => void;
}

/**
 * @public
 * @category UI
 * @name Image
 * @description You can use the `Image` component to load and render bitmap images (such as PNG, JPG) or vector images (SVG). It automatically renders with the appropriate method depending on the image format.
 *
 * @param {object} [props] - The `props` object passed to the component.
 * @param {object} [props.style] - An object that defines the style for the image component. It can include layout-related properties like `width` and `height`.
 * @param {object} [props.source] - An object containing information about the image resource to load.
 * @param {string} [props.source.uri] - The URI address representing the image resource to load.
 * @param {'immutable' | 'web' | 'cacheOnly'} [props.source.cache = 'immutable'] - An option to set the image caching strategy. This applies only to bitmap images. The default value is `immutable`.
 * @param {() => void} [props.onLoadStart] - A callback function that is called when image loading starts.
 * @param {() => void} [props.onLoadEnd] - A callback function that is called when image loading finishes.
 * @param {() => void} [props.onError] - A callback function that is called when an error occurs during image loading.
 *
 * @example
 * ### Example: Loading and rendering an image
 *
 * The following example shows how to load bitmap and vector image resources, and how to print an error message to `console.log` if an error occurs.
 *
 * ```tsx
 * import { Image } from '@granite-js/react-native';
 * import { View } from 'react-native';
 *
 * export function ImageExample() {
 *   return (
 *     <View>
 *       <Image
 *         source={{ uri: 'my-image-link' }}
 *         style={{
 *           width: 300,
 *           height: 300,
 *           borderWidth: 1,
 *         }}
 *         onError={() => {
 *           console.log('Failed to load image');
 *         }}
 *       />
 *
 *       <Image
 *         source={{ uri: 'my-svg-link' }}
 *         style={{
 *           width: 300,
 *           height: 300,
 *           borderWidth: 1,
 *         }}
 *         onError={() => {
 *           console.log('Failed to load image');
 *         }}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
function Image(props: ImageProps) {
  if (typeof props.source === 'object' && props.source.uri?.endsWith('.svg')) {
    const style = StyleSheet.flatten(props.style);
    const width = style?.width;
    const height = style?.height;

    return (
      <SvgImage
        testID={props.testID}
        url={props.source.uri!}
        width={width}
        height={height}
        style={props.style}
        onLoadStart={props.onLoadStart}
        onLoadEnd={props.onLoadEnd}
        onError={props.onError}
      />
    );
  }

  const source: GraniteImageSource | string | undefined = props.source
    ? props.source.uri
      ? {
          uri: props.source.uri,
          headers: props.source.headers,
          priority: props.source.priority,
          cache: props.source.cache,
        }
      : undefined
    : undefined;

  if (!source) {
    return null;
  }

  return <GraniteImage {...props} source={source} onError={props.onError ? () => props.onError?.() : undefined} />;
}

export { Image };
