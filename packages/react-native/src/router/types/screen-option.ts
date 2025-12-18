import { NativeStackNavigationOptions } from '@granite-js/native/@react-navigation/native-stack';
import { Platform } from 'react-native';

export const DEFAULT_BACKGROUND_COLOR = '#ffffff';
export const DEFAULT_HEADER_TINT_COLOR = '#191f28';
export const BASE_STACK_NAVIGATOR_STYLE: NativeStackNavigationOptions = {
  contentStyle: {
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
  },
  headerTintColor: DEFAULT_HEADER_TINT_COLOR,
  headerTitleStyle: {
    color: 'transparent',
  },
  headerStyle: {
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
  },
  headerShadowVisible: false,

  // FIX
  // According to the docs, react-navigation's Android transition behavior should follow the OS default, but in reality, it doesn't.
  // We've decided to solve this issue by unifying the animation to slide up from bottom.
  animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
};
