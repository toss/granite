import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';
import { isNewArchEnabled } from '../utils/isNewArchEnabled';

function getKeyboardEventNames() {
  if (Platform.OS === 'ios') {
    return {
      show: 'keyboardWillShow',
      hide: 'keyboardWillHide',
    } as const;
  }

  if (Platform.OS === 'android' && isNewArchEnabled()) {
    return {
      show: 'keyboardDidShow',
      hide: 'keyboardDidHide',
    } as const;
  }

  return null;
}

function getInitialKeyboardHeight() {
  if (Platform.OS === 'android' && !isNewArchEnabled()) {
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
