import { useLayoutEffect } from 'react';
import { useColorScheme } from 'react-native';
import type { StatusBarProps } from './types';
import { toStatusBarContentStyle } from './utils';
import { useNavigation } from '../router/createRoute';

export function StatusBar(props: StatusBarProps) {
  useStatusBar(props);

  return null;
}

export function useStatusBar({ style, hidden }: StatusBarProps) {
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'light';

  useLayoutEffect(() => {
    let statusBarStyle: 'light' | 'dark';

    switch (toStatusBarContentStyle(style, colorScheme)) {
      case 'light-content':
        statusBarStyle = 'light';
        break;
      case 'dark-content':
        statusBarStyle = 'dark';
        break;
    }

    navigation.setOptions({
      statusBarStyle,
      statusBarHidden: hidden,
    });
  }, [navigation, colorScheme, style, hidden]);
}
