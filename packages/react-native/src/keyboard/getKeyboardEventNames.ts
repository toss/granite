import { Platform } from "react-native";
import { isNewArchEnabled } from "../utils/isNewArchEnabled";

export function getKeyboardEventNames() {
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