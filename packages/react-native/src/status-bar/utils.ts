import type { StatusBarStyle } from './types';
import type { ColorPreference } from '../initial-props';

export function toStatusBarContentStyle(
  statusBarStyle: StatusBarStyle = 'auto',
  colorPreference: ColorPreference = 'light'
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
