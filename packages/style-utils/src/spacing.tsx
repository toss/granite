import { memo } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

interface Props extends ViewProps {
  size: number;
  direction?: 'vertical' | 'horizontal';
  style?: StyleProp<ViewStyle>;
}

/**
 * @public
 * @category UI
 * @name Spacing
 * @description
 * `Spacing` is a component that adds margin by occupying empty space. You can specify the size of the margin in either horizontal or vertical direction.
 *
 * @param {object} [props] - The `props` object passed to the component.
 * @param {number} props.size - A numeric value that sets the size of the margin.
 * @param {'vertical' | 'horizontal'} [props.direction = 'vertical'] - Sets the direction in which the margin will occupy space. Default value is `'vertical'`.
 * @param {StyleProp<ViewStyle>} [props.style] - The `style` value to be applied to the `Spacing` component. Default value is `undefined`, used when applying additional styles.
 *
 * @example
 * ### Example of creating empty space by adding margins of size `16` in both horizontal and vertical directions
 *
 * ```tsx
 * import { View, Text } from 'react-native';
 * import { Spacing } from '@granite-js/react-native';
 *
 * export function SpacingExample() {
 *   return (
 *     <View>
 *       <Text>Top</Text>
 *       <Spacing size={16} direction="vertical" style={{ backgroundColor: 'red', width: 5 }} />
 *       <Text>Bottom, positioned below by the vertical margin</Text>
 *
 *       <View style={{ flexDirection: 'row' }}>
 *         <Text>Left</Text>
 *         <Spacing size={16} direction="horizontal" style={{ backgroundColor: 'red', height: 5 }} />
 *         <Text>Right, positioned to the side by the horizontal margin</Text>
 *       </View>
 *     </View>
 *   );
 * }
 * ```
 */
export const Spacing = memo(function Spacing({ size, direction = 'vertical', style, ...restProps }: Props) {
  const directionStyle =
    direction === 'vertical'
      ? {
          height: size,
        }
      : {
          width: size,
        };

  return <View style={[directionStyle, style]} {...restProps} />;
});
