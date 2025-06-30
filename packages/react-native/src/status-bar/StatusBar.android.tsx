import { useLayoutEffect } from 'react';
import { StatusBar as BaseStatusBar, useColorScheme } from 'react-native';
import type { StatusBarProps } from './types';
import { toStatusBarContentStyle } from './utils';

export function StatusBar({ style, animated, hidden, backgroundColor, translucent = true }: StatusBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const translucentWithNoBackgroundColor = translucent && backgroundColor == null;

  return (
    <BaseStatusBar
      translucent={translucent}
      barStyle={toStatusBarContentStyle(style, colorScheme)}
      backgroundColor={translucentWithNoBackgroundColor ? 'transparent' : backgroundColor}
      animated={animated}
      hidden={hidden}
    />
  );
}

export function useStatusBar({ style, animated, hidden, backgroundColor, translucent = true }: StatusBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const translucentWithNoBackgroundColor = translucent && backgroundColor == null;

  useLayoutEffect(() => {
    BaseStatusBar.setTranslucent(translucent);
    BaseStatusBar.setBarStyle(toStatusBarContentStyle(style, colorScheme));
    BaseStatusBar.setBackgroundColor(
      translucentWithNoBackgroundColor ? 'transparent' : (backgroundColor ?? 'transparent')
    );

    if (hidden !== undefined) {
      BaseStatusBar.setHidden(hidden);
    }
  }, [colorScheme, translucentWithNoBackgroundColor, style, animated, hidden, backgroundColor, translucent]);
}
