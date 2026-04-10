import { useEffect, useRef } from 'react';
import { Animated, Keyboard } from 'react-native';
import { getInitialKeyboardHeight } from './getInitialKeyboardHeight';
import { getKeyboardEventNames } from './getKeyboardEventNames';

/**
 * @category Hooks
 * @name useKeyboardAnimatedHeight
 * @description
 * A Hook that returns an animatable value (`Animated.Value`) representing the keyboard height changes when the keyboard appears or disappears. You can smoothly animate UI elements according to the keyboard height as it rises or falls.
 *
 * This Hook uses `keyboardWillShow`/`keyboardWillHide` on iOS, and `keyboardDidShow`/`keyboardDidHide` on Android when React Native New Architecture is enabled. On Android Old Architecture, it always returns an `Animated.Value` with an initial value of `0`.
 *
 * @returns {Animated.Value} - An animation value representing the keyboard height.
 * @example
 * ```typescript
 * const keyboardHeight = useKeyboardAnimatedHeight();
 *
 * <Animated.View style={{ marginBottom: keyboardHeight }}>
 *  {children}
 * </Animated.View>
 * ```
 */
export function useKeyboardAnimatedHeight(): Animated.Value {
  const keyboardHeight = useRef(new Animated.Value(getInitialKeyboardHeight())).current;

  useEffect(() => {
    const keyboardEventNames = getKeyboardEventNames();

    if (keyboardEventNames == null) {
      return;
    }

    const showSubscription = Keyboard.addListener(keyboardEventNames.show, (event) => {
      const height = event.endCoordinates.height;

      Animated.spring(keyboardHeight, {
        toValue: height,
        useNativeDriver: true,
        ...spring.quick,
      }).start();
    });

    const hideSubscription = Keyboard.addListener(keyboardEventNames.hide, () => {
      Animated.spring(keyboardHeight, {
        toValue: 0,
        useNativeDriver: true,
        ...spring.quick,
      }).start();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardHeight]);

  return keyboardHeight;
}

const spring = {
  quick: {
    stiffness: 800,
    damping: 55,
    mass: 1,
  },
};
