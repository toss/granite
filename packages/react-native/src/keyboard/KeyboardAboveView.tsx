import { ComponentProps, ReactElement } from 'react';
import { Animated, View } from 'react-native';
import { useKeyboardAnimatedHeight } from './useKeyboardAnimatedHeight';

/**
 * @public
 * @category UI
 * @name KeyboardAboveView
 * @kind function
 * @description
 * A component that automatically lifts child components above the keyboard when it appears on the screen.
 * It's useful when you want to keep elements like a "Send" button fixed above the keyboard during text input.
 *
 * @param {StyleProp<ViewStyle>} [props.style] - Additional styles can be applied. For example, you can set background color or size.
 * @param {ReactNode} [props.children] - Components to be displayed above the keyboard when it appears. For example, you can include buttons, text input fields, etc.
 * @returns {ReactElement} - Returns an [`Animated.View`](https://reactnative.dev/docs/animated#createanimatedcomponent) that is adjusted above the keyboard when it appears.
 * @example
 *
 * ### Lifting elements above the keyboard
 *
 * ```tsx
 * import { ScrollView, TextInput, View, Text } from 'react-native';
 * import { KeyboardAboveView } from '@granite-js/react-native';
 *
 * export function KeyboardAboveViewExample() {
 *   return (
 *     <>
 *       <ScrollView>
 *         <TextInput placeholder="placeholder" />
 *       </ScrollView>
 *
 *       <KeyboardAboveView>
 *         <View style={{ width: '100%', height: 50, backgroundColor: 'yellow' }}>
 *           <Text>Above the keyboard</Text>
 *         </View>
 *       </KeyboardAboveView>
 *     </>
 *   );
 * }
 * ```
 */
export function KeyboardAboveView({ style, children, ...props }: ComponentProps<typeof View>): ReactElement {
  const keyboardHeight = useKeyboardAnimatedHeight();

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              translateY: Animated.subtract(0, keyboardHeight),
            },
          ],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
