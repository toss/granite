import { type FastImageSource, FastImage, FastImageProps } from './FastImage';

type Source = {
  uri?: string;
  headers?: Record<string, string>;
  priority?: 'low' | 'normal' | 'high';
  cache?: 'immutable' | 'web' | 'cacheOnly';
};

export interface ImageProps extends Omit<FastImageProps, 'source' | 'onError'> {
  source?: Source;
  onError?: () => void;
}

/**
 * @public
 * @category UI
 * @name Image
 * @description You can use the `Image` component to load and render bitmap images (such as PNG, JPG, GIF, WebP).
 * For SVG support, use the `Image` component from `@granite-js/react-native` instead.
 *
 * @param {object} [props] - The `props` object passed to the component.
 * @param {object} [props.style] - An object that defines the style for the image component. It can include layout-related properties like `width` and `height`.
 * @param {object} [props.source] - An object containing information about the image resource to load.
 * @param {string} [props.source.uri] - The URI address representing the image resource to load.
 * @param {'immutable' | 'web' | 'cacheOnly'} [props.source.cache = 'immutable'] - An option to set the image caching strategy. The default value is `immutable`.
 * @param {() => void} [props.onLoadStart] - A callback function that is called when image loading starts.
 * @param {() => void} [props.onLoadEnd] - A callback function that is called when image loading finishes.
 * @param {() => void} [props.onError] - A callback function that is called when an error occurs during image loading.
 *
 * @example
 * ### Example: Loading and rendering a bitmap image
 *
 * ```tsx
 * import { Image } from '@granite-js/image';
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
 *     </View>
 *   );
 * }
 * ```
 */
function Image(props: ImageProps) {
  const source: FastImageSource | string | undefined = props.source
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

  return <FastImage {...props} source={source} onError={props.onError ? () => props.onError?.() : undefined} />;
}

export { Image };
