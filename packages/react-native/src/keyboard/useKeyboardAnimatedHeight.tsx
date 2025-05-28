import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

function getInitialKeyboardHeight() {
  if (Platform.OS !== 'ios') {
    return 0;
  }

  /**
   * Branch handling for React Native 0.68.0 version where `metrics()` does not exist
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof Keyboard?.metrics === 'function') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Keyboard.metrics()?.height ?? 0;
  } else {
    return 0;
  }
}

/**
 * @category Hooks
 * @name useKeyboardAnimatedHeight
 * @description
 * A Hook that returns an animatable value (`Animated.Value`) representing the keyboard height changes when the keyboard appears or disappears. You can smoothly animate UI elements according to the keyboard height as it rises or falls.
 *
 * This Hook is primarily used on iOS. On Android, it does not detect keyboard height changes and always returns an `Animated.Value` with an initial value of `0`. In other words, animations are not applied in the Android environment.
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
    if (Platform.OS === 'ios') {
      const willShowSubscription = Keyboard.addListener('keyboardWillShow', (event) => {
        const height = event.endCoordinates.height;

        Animated.spring(keyboardHeight, {
          toValue: height,
          useNativeDriver: true,
          ...spring.quick,
        }).start();
      });

      const willHideSubscription = Keyboard.addListener('keyboardWillHide', () => {
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: true,
          ...spring.quick,
        }).start();
      });
      return () => {
        willShowSubscription.remove();
        willHideSubscription.remove();
      };
    } else {
      return;
    }
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
