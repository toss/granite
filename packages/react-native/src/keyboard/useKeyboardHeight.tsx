import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { getInitialKeyboardHeight } from './getInitialKeyboardHeight';
import { getKeyboardEventNames } from './getKeyboardEventNames';

/**
 * @category Hooks
 * @name useKeyboardHeight
 * @description
 * A Hook that returns the current keyboard height as a number when the keyboard appears or disappears. Unlike `useKeyboardAnimatedHeight`, this Hook does not animate the value — it simply reflects the latest keyboard height.
 *
 * This Hook uses `keyboardWillShow`/`keyboardWillHide` on iOS, and `keyboardDidShow`/`keyboardDidHide` on Android when React Native New Architecture is enabled. On Android Old Architecture, it always returns `0`.
 *
 * @returns {number} - The current keyboard height.
 * @example
 * ```typescript
 * const keyboardHeight = useKeyboardHeight();
 *
 * <View style={{ marginBottom: keyboardHeight }}>
 *  {children}
 * </View>
 * ```
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState<number>(getInitialKeyboardHeight);

  useEffect(() => {
    const keyboardEventNames = getKeyboardEventNames();

    if (keyboardEventNames == null) {
      return;
    }

    const showSubscription = Keyboard.addListener(keyboardEventNames.show, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(keyboardEventNames.hide, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardHeight;
}
