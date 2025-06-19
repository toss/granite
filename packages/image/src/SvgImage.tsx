import { SvgUri, SvgXml } from '@granite-js/native/react-native-svg';
import { createElement, useEffect, useCallback, useState } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { usePreservedCallback } from 'react-simplikit';
import type { DimensionValue, NumberValue } from './types';

export interface SvgImageProps {
  url: string;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<any>;
  testID?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
}

/**
 * @name SvgImage
 * @category Components
 * @description The `SvgImage` component loads and renders SVG images from a given external URL.
 * @link https://github.com/software-mansion/react-native-svg/tree/v13.14.0/README.md
 *
 * @param {object} props - The `props` object passed to the component.
 * @param {string} props.url - The URI address of the SVG image to load.
 * @param {number | string} [props.width = '100%'] - Sets the horizontal size of the SVG image. Default value is '`100%`'.
 * @param {number | string} [props.height = '100%'] - Sets the vertical size of the SVG image. Default value is '`100%`'.
 * @param {object} props.style - Sets the style of the image component.
 * @param {() => void} props.onLoadStart - A callback function called when the SVG image resource starts loading.
 * @param {() => void} props.onLoadEnd - A callback function called after the SVG image resource is loaded.
 * @param {() => void} props.onError - A callback function called when an error occurs during SVG image loading.
 *
 * @example
 * ```tsx
 * import { SvgImage } from './SvgImage';
 * import { View } from 'react-native';
 *
 * function MyComponent() {
 *   return (
 *     <View>
 *       <SvgImage
 *         url="https://example.com/icon.svg"
 *         width={100}
 *         height={100}
 *         onError={() => console.log('An error occurred while loading the SVG')}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function SvgImage({
  url,
  width = '100%',
  height = '100%',
  style,
  testID,
  onLoadStart: _onLoadStart,
  onLoadEnd: _onLoadEnd,
  onError: _onError,
}: SvgImageProps) {
  const svgStyle = { width, height } as { width: NumberValue; height: NumberValue };
  const [data, setData] = useState<string | undefined>(undefined);
  const [isError, setIsError] = useState(false);

  const onLoadStart = usePreservedCallback(() => _onLoadStart?.());
  const onLoadEnd = usePreservedCallback(() => _onLoadEnd?.());
  const onError = usePreservedCallback(() => _onError?.());

  // Component to occupy layout space when the image is not yet rendered
  const Fallback = useCallback(
    () => createElement(View, { style: { width, height } as ViewStyle }, null),
    [width, height]
  );

  useEffect(() => {
    let isMounted = true;

    /**
     * First attempts to fetch the XML resource, and if that fails, tries to load directly by passing the URI to the Svg component
     */
    async function fetchSvg() {
      onLoadStart();

      try {
        const response = await fetch(url);
        const svg = await response.text();

        if (isMounted) {
          onLoadEnd();
          setData(svg);
        }
      } catch {
        setIsError(true);
      }
    }

    fetchSvg();

    return () => {
      isMounted = false;
    };
  }, [onLoadStart, onLoadEnd, url]);

  if (data == null) {
    return <Fallback />;
  }

  if (isError) {
    return (
      <SvgUri
        testID={testID}
        uri={url}
        style={style}
        {...svgStyle}
        onError={onError}
        onLoad={onLoadEnd}
        fallback={<Fallback />}
      />
    );
  }

  return <SvgXml testID={testID} xml={data} style={style} {...svgStyle} fallback={<Fallback />} />;
}
