import { ColorSchemeName } from 'react-native';
import type { StatusBarStyle } from './types';

export function toStatusBarContentStyle(
  statusBarStyle: StatusBarStyle = 'auto',
  colorPreference: ColorSchemeName = 'light'
): 'light-content' | 'dark-content' {
  const resolvedStyle = (() => {
    switch (statusBarStyle) {
      case 'auto':
        return colorPreference === 'light' ? 'dark' : 'light';
      case 'inverted':
        return colorPreference === 'light' ? 'light' : 'dark';
      default:
        return statusBarStyle;
    }
  })();

  return resolvedStyle === 'light' ? 'light-content' : 'dark-content';
}
