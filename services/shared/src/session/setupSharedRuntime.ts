import * as graniteImage from '@granite-js/image';
import * as graniteLottie from '@granite-js/lottie';
import { setupSharedRuntime } from '@granite-js/plugin-micro-frontend/runtime';
import * as graniteVideo from '@granite-js/video';
import * as asyncStorage from '@react-native-async-storage/async-storage';
import * as communityBlur from '@react-native-community/blur';
import * as navigationElements from '@react-navigation/elements';
import * as navigationNative from '@react-navigation/native';
import * as navigationNativeStack from '@react-navigation/native-stack';
import * as sentryReactNative from '@sentry/react-native';
import * as flashList from '@shopify/flash-list';
import * as brickModule from 'brick-module';
import * as react from 'react';
import * as reactJsxDevRuntime from 'react/jsx-dev-runtime';
import * as reactJsxRuntime from 'react/jsx-runtime';
import * as reactNative from 'react-native';
import * as batchedBridge from 'react-native/Libraries/BatchedBridge/BatchedBridge';
import * as messageQueue from 'react-native/Libraries/BatchedBridge/MessageQueue';
import * as nativeModules from 'react-native/Libraries/BatchedBridge/NativeModules';
import * as nativeComponentRegistry from 'react-native/Libraries/NativeComponent/NativeComponentRegistry';
import * as nativeComponentRegistryUnstable from 'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable';
import * as viewConfigIgnore from 'react-native/Libraries/NativeComponent/ViewConfigIgnore';
import * as rendererProxy from 'react-native/Libraries/ReactNative/RendererProxy';
import * as platformColorValueTypes from 'react-native/Libraries/StyleSheet/PlatformColorValueTypes';
import * as normalizeColor from 'react-native/Libraries/StyleSheet/normalizeColor';
import * as processColor from 'react-native/Libraries/StyleSheet/processColor';
import * as turboModuleRegistry from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import * as nativePlatformConstantsIOS from 'react-native/Libraries/Utilities/NativePlatformConstantsIOS';
import * as platform from 'react-native/Libraries/Utilities/Platform';
import * as defineLazyObjectProperty from 'react-native/Libraries/Utilities/defineLazyObjectProperty';
import * as gestureHandler from 'react-native-gesture-handler';
import * as pagerView from 'react-native-pager-view';
import * as safeAreaContext from 'react-native-safe-area-context';
import * as screens from 'react-native-screens';
import * as svg from 'react-native-svg';
import * as webview from 'react-native-webview';

export function setupServiceSessionSharedRuntime() {
  setupSharedRuntime({
    '@granite-js/image': graniteImage,
    '@granite-js/lottie': graniteLottie,
    '@granite-js/video': graniteVideo,
    '@react-native-async-storage/async-storage': asyncStorage,
    '@react-native-community/blur': communityBlur,
    '@react-navigation/elements': navigationElements,
    '@react-navigation/native': navigationNative,
    '@react-navigation/native-stack': navigationNativeStack,
    '@shopify/flash-list': flashList,
    '@sentry/react-native': sentryReactNative,
    'brick-module': brickModule,
    'react': react,
    'react/jsx-dev-runtime': reactJsxDevRuntime,
    'react/jsx-runtime': reactJsxRuntime,
    'react-native': reactNative,
    'react-native-gesture-handler': gestureHandler,
    'react-native-pager-view': pagerView,
    'react-native-safe-area-context': safeAreaContext,
    'react-native-screens': screens,
    'react-native-svg': svg,
    'react-native-webview': webview,
    'react-native/Libraries/BatchedBridge/BatchedBridge': batchedBridge,
    'react-native/Libraries/BatchedBridge/MessageQueue': messageQueue,
    'react-native/Libraries/BatchedBridge/NativeModules': nativeModules,
    'react-native/Libraries/NativeComponent/NativeComponentRegistry': nativeComponentRegistry,
    'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable': nativeComponentRegistryUnstable,
    'react-native/Libraries/NativeComponent/ViewConfigIgnore': viewConfigIgnore,
    'react-native/Libraries/ReactNative/RendererProxy': rendererProxy,
    'react-native/Libraries/StyleSheet/PlatformColorValueTypes': platformColorValueTypes,
    'react-native/Libraries/StyleSheet/normalizeColor': normalizeColor,
    'react-native/Libraries/StyleSheet/processColor': processColor,
    'react-native/Libraries/TurboModule/TurboModuleRegistry': turboModuleRegistry,
    'react-native/Libraries/Utilities/NativePlatformConstantsIOS': nativePlatformConstantsIOS,
    'react-native/Libraries/Utilities/Platform': platform,
    'react-native/Libraries/Utilities/defineLazyObjectProperty': defineLazyObjectProperty,
  });
}
