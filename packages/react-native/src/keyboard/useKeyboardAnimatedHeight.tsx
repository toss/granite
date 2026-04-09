import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

function getInitialKeyboardHeight() {
  // React Native 0.68 does not provide Keyboard.metrics()
  const keyboardWithMetrics = Keyboard as typeof Keyboard & {
    metrics?: () => { height?: number } | undefined;
  };

  if (typeof keyboardWithMetrics.metrics === 'function') {
    return keyboardWithMetrics.metrics()?.height ?? 0;
  }

  return 0;
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

  const animateToHeight = (height: number) => {
    Animated.spring(keyboardHeight, {
      toValue: height,
      useNativeDriver: true,
      ...spring.quick,
    }).start();
  };

  useEffect(() => {
    const eventByPlatform = {
      ios: { show: 'keyboardWillShow', hide: 'keyboardWillHide' },
      android: { show: 'keyboardDidShow', hide: 'keyboardDidHide' },
    } as const;

    const platformEvents = eventByPlatform[Platform.OS as 'ios' | 'android'];
    if (!platformEvents) {
      return;
    }

    const showSubscription = Keyboard.addListener(platformEvents.show, (event) => {
      animateToHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(platformEvents.hide, () => {
      animateToHeight(0);
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
