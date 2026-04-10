import { Platform } from "react-native";
import { isNewArchEnabled } from "../utils/isNewArchEnabled";

export function getInitialKeyboardHeight() {
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