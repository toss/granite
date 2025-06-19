import * as ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import * as ReactNativeBlur from '@react-native-community/blur';
import * as ReactNavigationNative from '@react-navigation/native';
import * as ReactNavigationNativeStack from '@react-navigation/native-stack';
import * as ReactNativeFlashList from '@shopify/flash-list';
import * as LottieReactNative from 'lottie-react-native';
import * as React from 'react';
import * as ReactNative from 'react-native';
import * as ReactNativeFastImage from 'react-native-fast-image';
import * as ReactNativeGestureHandler from 'react-native-gesture-handler';
import * as ReactNativeSafeAreaContext from 'react-native-safe-area-context';
import * as ReactNativeScreens from 'react-native-screens';
import * as ReactNativeSVG from 'react-native-svg';
import * as ReactNativeVideo from 'react-native-video';
import * as ReactNativeWebView from 'react-native-webview';
import { defineESModule } from './defineESModule';

/**
 * Returns the module from the shared module scope.
 *
 * @TODO: A structured module management system is needed to allow control through the build configuration (e.g., support for Module Federation).
 *
 * Related: service preset in `@granite-js/cli`
 *
 * @param identifier
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function __granite_require__(identifier: string) {
  switch (identifier) {
    case '@react-native-async-storage/async-storage': {
      return defineESModule(ReactNativeAsyncStorage);
    }
    case '@react-native-community/blur': {
      return defineESModule(ReactNativeBlur);
    }
    case '@react-navigation/native': {
      return defineESModule(ReactNavigationNative);
    }
    case '@react-navigation/native-stack': {
      return defineESModule(ReactNavigationNativeStack);
    }
    case '@shopify/flash-list': {
      return defineESModule(ReactNativeFlashList);
    }
    case 'lottie-react-native': {
      return defineESModule(LottieReactNative);
    }
    case 'react-native-safe-area-context': {
      return defineESModule(ReactNativeSafeAreaContext);
    }
    case 'react-native-screens': {
      return defineESModule(ReactNativeScreens);
    }
    case 'react-native-fast-image': {
      return defineESModule(ReactNativeFastImage);
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
    case 'react-native-video': {
      return defineESModule(ReactNativeVideo);
    }
    case 'react-native-webview': {
      return defineESModule(ReactNativeWebView);
    }
    default: {
      throw new Error(`${identifier} is an undefined module.`);
    }
  }
}
