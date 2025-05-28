import { forwardRef, type ReactElement, type ReactNode, type Ref } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

interface FlexOptions {
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  direction?: ViewStyle['flexDirection'];
}

interface Props extends FlexOptions, ViewProps {
  style?: ViewProps['style'];
  children?: ReactNode;
}

type FlexReturnType = (props: Props & { ref?: Ref<View> }) => ReactElement | null;

export function flex(options: FlexOptions | ViewStyle['alignItems']): ViewStyle;
export function flex(
  align: ViewStyle['alignItems'] | FlexOptions,
  justify?: ViewStyle['justifyContent'],
  direction?: ViewStyle['flexDirection']
): ViewStyle;
export function flex(
  alignOrFlexOptions: FlexOptions | ViewStyle['alignItems'],
  justify: ViewStyle['justifyContent'] = 'flex-start',
  direction: ViewStyle['flexDirection'] = 'column'
): ViewStyle {
  if (typeof alignOrFlexOptions === 'object') {
    const { align = 'stretch', direction = 'column', justify = 'flex-start' } = alignOrFlexOptions;

    return {
      alignItems: align,
      display: 'flex',
      flexDirection: direction,
      justifyContent: justify,
    };
  }

  return {
    display: 'flex',
    alignItems: alignOrFlexOptions,
    flexDirection: direction,
    justifyContent: justify,
  };
}

flex.center = (direction?: FlexOptions['direction']) => flex({ justify: 'center', align: 'center', direction });

const BaseFlex = forwardRef<View, Props>(function (
  { align = 'stretch', justify = 'flex-start', direction = 'column', style, ...restProps },
  ref
) {
  return <View ref={ref} style={[flex({ align, direction, justify }), style]} {...restProps} />;
}) as FlexReturnType;

type FlexType = typeof BaseFlex & {
  Center: typeof BaseFlex;
  CenterVertical: typeof BaseFlex;
  CenterHorizontal: typeof BaseFlex;
};

/**
 * @public
 * @category UI
 * @name Flex
 * @description
 * `Flex` is a component that arranges child elements based on [**Flexbox Layout**](https://reactnative.dev/docs/0.72/flexbox). Using Flexbox, you can easily align elements horizontally and vertically, and set center alignment with ease.
 * Use `Flex.Center` to place child elements in the center, `Flex.CenterVertical` for vertical center alignment, and `Flex.CenterHorizontal` for horizontal center alignment.
 *
 * @param {object} [props] - The `props` object passed to the component.
 * @param {'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'} [props.align = 'stretch'] - The alignment value for child elements along the main axis (Flex direction). For example, in `'column'` direction, `'center'` places elements at the horizontal center, and `'stretch'` expands elements to match the parent's width when their width is `'auto'`. This value is applied to [`alignItems`](https://reactnative.dev/docs/0.72/layout-props#alignitems), with a default value of `'stretch'`.
 * @param {'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'} [props.justify = 'flex-start'] - The alignment value for child elements along the cross axis (perpendicular to Flex direction). For example, in `'column'` direction, `flex-start` places elements at the top of the parent, and `'center'` places them at the vertical center. This value is applied to [`justifyContent`](https://reactnative.dev/docs/0.72/layout-props#justifycontent), with a default value of `'flex-start'`.
 * @param {'column' | 'row'} [props.direction = 'column'] - The value that sets the direction in which child elements are arranged. This is applied to [`flexDirection`](https://reactnative.dev/docs/0.72/layout-props#flexdirection), with a default value of `'column'`.
 * @param {ViewProps['style']} [props.style] - The `style` object to be applied to the `Flex` component. Used to specify styles other than Flexbox layout, such as background color, border, and margin. Default value is `undefined`.
 *
 * @property {FlexCenter} [Center] - `Flex.Center` is a component that places child elements at the exact center both horizontally and vertically based on **Flex Layout**.
 * @property {FlexCenterVertical} [CenterVertical] - `Flex.CenterVertical` is a component for **vertically centering** child elements based on Flex Layout.
 * @property {FlexCenterHorizontal} [CenterHorizontal] - `Flex.CenterHorizontal` is a component for **horizontally centering** child elements based on Flex Layout.
 *
 * @example
 * ### Example of arranging elements horizontally and vertically
 *
 * ```tsx
 * import { Flex } from '@granite-js/react-native';
 * import { Text } from 'react-native';
 *
 * function FlexExample() {
 *   return (
 *     <>
 *       <Flex direction="column">
 *         <Text>Arrange vertically</Text>
 *         <Text>1</Text>
 *         <Text>2</Text>
 *         <Text>3</Text>
 *       </Flex>
 *       <Flex direction="row">
 *         <Text>Arrange horizontally</Text>
 *         <Text>1</Text>
 *         <Text>2</Text>
 *         <Text>3</Text>
 *       </Flex>
 *     </>
 *   );
 * }
 * ```
 */
export const Flex = BaseFlex as FlexType;

/**
 * @public
 * @category UI
 * @name FlexCenter
 * @description
 * `Flex.Center` is a component that places child elements at the exact center both horizontally and vertically based on [**Flexbox Layout**](https://reactnative.dev/docs/0.72/flexbox).
 * Both `alignItems` and `justifyContent` properties are set to `'center'`, placing child elements at the center of the parent component.
 * You can easily center-align elements using `Flexbox`.
 *
 * @param {object} [props] - The props object passed to the component.
 * @param {'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'} [props.align = 'center'] - The alignment value for child elements along the main axis (Flex direction). For example, in `'column'` direction, `'center'` places elements at the horizontal center, and `'stretch'` expands elements to match the parent's width when their width is `'auto'`. This value is applied to [`alignItems`](https://reactnative.dev/docs/0.72/layout-props#alignitems), with a default value of `'center'`.
 * @param {'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'} [props.justify = 'center'] - The alignment value for child elements along the cross axis (perpendicular to Flex direction). For example, in `'column'` direction, `flex-start` places elements at the top of the parent, and `'center'` places them at the vertical center. This value is applied to [`justifyContent`](https://reactnative.dev/docs/0.72/layout-props#justifycontent), with a default value of `'center'`.
 * @param {'column' | 'row'} [props.direction = 'column'] - The value that sets the direction in which child elements are arranged. Default value is `'column'`, arranging elements vertically.
 * @param {ViewProps['style']} [props.style] - The `style` object to be applied to the `Flex.Center` component. Used to specify styles other than Flexbox layout, such as background color, border, and margin. Default value is `undefined`.
 *
 * @example
 * ### Example of placing elements at the exact center
 *
 * ```tsx
 * import { Flex } from '@granite-js/react-native';
 * import { Text } from 'react-native';
 *
 * function FlexCenterExample() {
 *   return (
 *     <Flex.Center style={{ width: '100%', height: 100, borderWidth: 1 }}>
 *       <Text>Place at the exact center</Text>
 *     </Flex.Center>
 *   );
 * }
 * ```
 */
export const FlexCenter = forwardRef<View, Props>(function FlexCenter(props, ref) {
  return <BaseFlex align="center" justify="center" {...props} ref={ref} />;
});

/**
 * @public
 * @category UI
 * @name FlexCenterVertical
 * @description
 * `Flex.CenterVertical` is a component for **vertically centering** child elements based on [**Flexbox Layout**](https://reactnative.dev/docs/0.72/flexbox).
 * The `justifyContent` property is set to `'center'`, placing child elements at the vertical center of the parent component.
 *
 * @param {object} [props] - The props object passed to the component.
 * @param {'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'} [props.align = 'center'] - The alignment value for child elements along the main axis (Flex direction). For example, in `'column'` direction, `'center'` places elements at the horizontal center, and `'stretch'` expands elements to match the parent's width when their width is `'auto'`. This value is applied to [`alignItems`](https://reactnative.dev/docs/0.72/layout-props#alignitems), with a default value of `'stretch'`.
 * @param {'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'} [props.justify = 'center'] - The alignment value for child elements along the cross axis (perpendicular to Flex direction). For example, in `'column'` direction, `flex-start` places elements at the top of the parent, and `'center'` places them at the vertical center. This value is applied to [`justifyContent`](https://reactnative.dev/docs/0.72/layout-props#justifycontent), with a default value of `'center'`.
 * @param {'column' | 'row'} [props.direction = 'column'] - The value that sets the direction in which child elements are arranged. Default value is `'column'`, arranging elements vertically.
 * @param {ViewProps['style']} [props.style] - The `style` object to be applied to the `Flex.CenterVertical` component. Used to specify styles other than Flexbox layout, such as background color, border, and margin. Default value is `undefined`.
 *
 * @example
 * ### Example of vertically centering elements
 *
 * ```tsx
 * import { Flex } from '@granite-js/react-native';
 * import { Text } from 'react-native';
 *
 * function FlexCenterVerticalExample() {
 *   return (
 *     <Flex.CenterVertical style={{ width: '100%', height: 100, borderWidth: 1 }}>
 *       <Text>Place at the vertical center</Text>
 *     </Flex.CenterVertical>
 *   );
 * }
 * ```
 */
export const FlexCenterVertical = forwardRef<View, Props>(function FlexCenterVertical(props, ref) {
  return <BaseFlex justify="center" {...props} ref={ref} />;
});

/**
 * @public
 * @category UI
 * @name FlexCenterHorizontal
 * @description
 * `Flex.CenterHorizontal` is a component for **horizontally centering** child elements based on [**Flexbox Layout**](https://reactnative.dev/docs/0.72/flexbox).
 * The `alignItems` property is set to `'center'`, placing child elements at the horizontal center of the parent component.
 *
 * @param {object} [props] - The props object passed to the component.
 * @param {'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'} [props.align = 'center'] - The alignment value for child elements along the main axis (Flex direction). For example, in `'column'` direction, `'center'` places elements at the horizontal center, and `'stretch'` expands elements to match the parent's width when their width is `'auto'`. This value is applied to [`alignItems`](https://reactnative.dev/docs/0.72/layout-props#alignitems), with a default value of `'center'`.
 * @param {'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'} [props.justify = 'flex-start'] - The alignment value for child elements along the cross axis (perpendicular to Flex direction). For example, in `'column'` direction, `flex-start` places elements at the top of the parent, and `'center'` places them at the vertical center. This value is applied to [`justifyContent`](https://reactnative.dev/docs/0.72/layout-props#justifycontent), with a default value of `'flex-start'`.
 * @param {'column' | 'row'} [props.direction = 'column'] - The value that sets the direction in which child elements are arranged. Default value is `'column'`, arranging elements vertically.
 * @param {ViewProps['style']} [props.style] - The `style` object to be applied to the `Flex.CenterHorizontal` component. Used to specify styles other than Flexbox layout, such as background color, border, and margin. Default value is `undefined`.
 *
 * @example
 * ### Example of horizontally centering elements
 *
 * ```tsx
 * import { Flex } from '@granite-js/react-native';
 * import { Text } from 'react-native';
 *
 * function FlexCenterHorizontalExample() {
 *   return (
 *     <Flex.CenterHorizontal style={{ width: '100%', height: 100, borderWidth: 1 }}>
 *       <Text>Place at the horizontal center</Text>
 *     </Flex.CenterHorizontal>
 *   );
 * }
 * ```
 */
export const FlexCenterHorizontal = forwardRef<View, Props>(function FlexCenterHorizontal(props, ref) {
  return <BaseFlex align="center" {...props} ref={ref} />;
});

Flex.Center = FlexCenter as FlexReturnType;
Flex.CenterVertical = FlexCenterVertical as FlexReturnType;
Flex.CenterHorizontal = FlexCenterHorizontal as FlexReturnType;
