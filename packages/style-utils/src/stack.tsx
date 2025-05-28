import { forwardRef, type ReactElement } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { Children } from './children';
import { Flex } from './flex';
import { Spacing } from './spacing';

type Direction = 'horizontal' | 'vertical';

interface StackProps extends ViewProps {
  direction?: Direction;
  gutter?: number | ReactElement;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
}

const BaseStack = forwardRef<View, StackProps>(function BaseStack(props, ref) {
  const { direction = 'vertical', gutter = 0, children, ...rest } = props;

  return (
    <Flex ref={ref} direction={direction === 'vertical' ? 'column' : 'row'} {...rest}>
      <Children.Gap
        gap={typeof gutter === 'number' ? <Spacing direction={direction} size={gutter ?? 24} /> : props.gutter}
      >
        {children}
      </Children.Gap>
    </Flex>
  );
});

/**
 * @public
 * @category UI
 * @name Stack
 * @description
 * `Stack` is a component that arranges child elements in a stack layout either horizontally or vertically, and allows you to set spacing between child elements.
 * You can specify the direction as horizontal or vertical using the `direction` property, and control the spacing between child elements using the `gutter` property.
 * You can use `Stack.Horizontal` for horizontal arrangement and `Stack.Vertical` for vertical arrangement.
 *
 * @param {object} [props] - The props object passed to the component.
 * @param {'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'} [props.align] - The alignment value for child elements along the main axis (Flex direction). For example, in `'column'` direction, `'center'` places elements at the horizontal center, and `'stretch'` expands elements to match the parent's width when their width is `'auto'`. This value is applied to [`alignItems`](https://reactnative.dev/docs/0.72/layout-props#alignitems).
 * @param {'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'} [props.justify] - The alignment value for child elements along the cross axis (perpendicular to Flex direction). For example, in `'column'` direction, `flex-start` places elements at the top of the parent, and `'center'` places them at the vertical center. This value is applied to [`justifyContent`](https://reactnative.dev/docs/0.72/layout-props#justifycontent).
 * @param {'vertical' | 'horizontal'} [props.direction = 'vertical'] - The value that sets the direction in which child elements are arranged. Default value is `'vertical'`.
 * @param {number | ReactElement} [props.gutter] - The value that sets the spacing between child elements. When a number is provided, it sets the margin in pixels, and when a `ReactElement` is passed, that component is used as the spacing. Using a number allows for precise control of spacing, while using a `ReactElement` enables more complex custom spacing implementations.
 *
 * @property {StackHorizontal} [Horizontal] - `Stack.Horizontal` is a component that arranges child elements in a **horizontal** stack.
 * @property {StackVertical} [Vertical] - `Stack.Vertical` is a component that arranges child elements in a **vertical** stack.
 *
 * @example
 * ### Example of arranging elements horizontally and vertically with a spacing of 16
 *
 * ```tsx
 * import { Text } from 'react-native';
 * import { Stack } from '@granite-js/react-native';
 *
 * export function StackExample() {
 *   return (
 *     <>
 *       <Stack gutter={16} direction="horizontal">
 *         <Text>Arrange horizontally with 16 spacing</Text>
 *         <Text>1</Text>
 *         <Text>2</Text>
 *         <Text>3</Text>
 *       </Stack>
 *       <Stack gutter={16} direction="vertical">
 *         <Text>Arrange vertically with 16 spacing</Text>
 *         <Text>1</Text>
 *         <Text>2</Text>
 *         <Text>3</Text>
 *       </Stack>
 *     </>
 *   );
 * }
 * ```
 */
export const Stack = BaseStack as StackType;

type StackType = typeof BaseStack & {
  Vertical: typeof StackVertical;
  Horizontal: typeof StackHorizontal;
};

type StackWithoutDirectionProps = Omit<StackProps, 'direction'>;

/**
 * @public
 * @category UI
 * @name StackHorizontal
 * @description
 * `Stack.Horizontal` is a component that arranges child elements in a horizontal stack. Using this component, you can easily control the spacing between child elements with the `gutter` property, maintaining a consistent layout in the horizontal direction.
 *
 * @param {object} [props] - The props object passed to the component.
 * @param {'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'} [props.align = 'stretch'] - The value that sets the horizontal alignment of child elements. Works the same as Flexbox's `align-items` property, with a default value of `'stretch'` that expands child elements to match the parent's width when their width is `'auto'`.
 * @param {'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'} [props.justify = 'flex-start'] - The value that sets the horizontal alignment of child elements. Works the same as Flexbox's `justify-content` property, with a default value of `'flex-start'` that aligns child elements to the top.
 * @param {number | ReactElement} [props.gutter] - The value that sets the spacing between child elements. When a number is provided, it sets the margin in pixels, and when a `ReactElement` is passed, that component is used as the spacing. Using a number allows for precise control of spacing, while using a `ReactElement` enables more complex custom spacing implementations.
 *
 * @example
 * ### Example of arranging elements horizontally with a spacing of 16
 *
 * ```tsx
 * import { Stack } from '@granite-js/react-native';
 * import { View, Text } from 'react-native';
 *
 * function StackHorizontalExample() {
 *   return (
 *     <Stack.Horizontal gutter={16}>
 *       <Text>Arrange horizontally with 16 spacing</Text>
 *       <Text>1</Text>
 *       <Text>2</Text>
 *       <Text>3</Text>
 *     </Stack.Horizontal>
 *   );
 * }
 * ```
 */
const StackHorizontal = forwardRef<View, StackWithoutDirectionProps>(function StackHorizontal(props, ref) {
  return <Stack direction="horizontal" {...props} ref={ref} />;
});

/**
 * @public
 * @category UI
 * @name StackVertical
 * @description
 * `Stack.Vertical` is a component that arranges child elements in a vertical stack. Using this component, you can easily control the spacing between child elements with the `gutter` property, maintaining a consistent layout in the vertical direction.
 *
 * @param {object} [props] - The props object passed to the component.
 * @param {string} [props.align = 'stretch'] - The value that sets the vertical alignment of child elements. Works the same as Flexbox's `align-items` property, with a default value of `'stretch'` that expands child elements to match the parent's height when their height is `'auto'`.
 * @param {string} [props.justify = 'flex-start'] - The value that sets the horizontal alignment of child elements. Works the same as Flexbox's `justify-content` property, with a default value of `'flex-start'` that aligns child elements to the left.
 * @param {number | ReactElement} [props.gutter] - The value that sets the spacing between child elements. When a number is provided, it sets the margin in pixels, and when a `ReactElement` is passed, that component is used as the spacing. Using a number allows for precise control of spacing, while using a `ReactElement` enables more complex custom spacing implementations.
 *
 * @example
 * ### Example of arranging elements vertically with a spacing of 16
 *
 * ```tsx
 * import { Stack } from '@granite-js/react-native';
 * import { View, Text } from 'react-native';
 *
 * function StackVerticalExample() {
 *   return (
 *     <Stack.Vertical gutter={16}>
 *       <Text>Arrange vertically with 16 spacing</Text>
 *       <Text>1</Text>
 *       <Text>2</Text>
 *       <Text>3</Text>
 *     </Stack.Vertical>
 *   );
 * }
 * ```
 */
const StackVertical = forwardRef<View, StackWithoutDirectionProps>(function StackVertical(props, ref) {
  return <Stack direction="vertical" {...props} ref={ref} />;
});

Stack.Horizontal = StackHorizontal;
Stack.Vertical = StackVertical;
