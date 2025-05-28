import * as ReactNavigationNative from '@react-navigation/native';
import * as ReactNavigationNativeStack from '@react-navigation/native-stack';
import * as React from 'react';
import * as ReactNative from 'react-native';
import * as ReactNativeGestureHandler from 'react-native-gesture-handler';
import * as ReactNativeSafeAreaContext from 'react-native-safe-area-context';
import * as ReactNativeScreens from 'react-native-screens';
import * as ReactNativeSVG from 'react-native-svg';
import { defineESModule } from './defineESModule';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function __granite_require__(identifier: string) {
  switch (identifier) {
    case '@react-navigation/native': {
      return defineESModule(ReactNavigationNative);
    }
    case '@react-navigation/native-stack': {
      return defineESModule(ReactNavigationNativeStack);
    }
    case 'react-native-safe-area-context': {
      return defineESModule(ReactNativeSafeAreaContext);
    }
    case 'react-native-screens': {
      return defineESModule(ReactNativeScreens);
    }
    case 'react-native-svg': {
      return defineESModule(ReactNativeSVG);
    }
    case 'react-native-gesture-handler': {
      return defineESModule(ReactNativeGestureHandler);
    }
    case 'react-native': {
      return defineESModule(ReactNative);
    }
    case 'react': {
      return defineESModule(React);
    }
    default: {
      throw new Error(`${identifier} is an undefined module.`);
    }
  }
}
