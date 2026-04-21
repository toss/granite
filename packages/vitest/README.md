# `@granite-js/vitest`

Vitest helpers for Granite React Native projects.

## Usage

```ts
import { defineConfig } from 'vitest/config';
import { reactNative } from '@granite-js/vitest';

export default defineConfig({
  plugins: [reactNative()],
});
```

`reactNative()` injects the React Native mirror aliases, the Vitest `node` environment, `globals: true`, Jest-like test globs, and the packaged React Native runtime/setup files.

## React Native Jest Preset Parity

**Status:** `100%`

This package currently treats the following contract as the parity target:

- `react-native/jest-preset.js`
- `react-native/jest/react-native-env.js`
- `react-native/jest/setup.js`
- the top-level `react-native` facade exposed by `react-native/index.js`

Here, `100%` means the tracked parity checklist for that surface is implemented inside this package, not that every React Native ecosystem package is mocked.

## What Is Mocked

### 1. Config / Environment parity

`reactNative()` injects the preset-style config below:

- `test.environment = 'node'`
- `test.globals = true`
- `test.include = ['**/__tests__/**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*.spec.{js,jsx,ts,tsx}', '**/?(*.)test.{js,jsx,ts,tsx}', '**/?(*.)spec.{js,jsx,ts,tsx}']`
- `test.setupFiles = [reactNativeRuntime, setup]`
- `resolve.conditions = ['require', 'react-native']`
- `resolve.extensions = ['.ios.tsx', '.ios.ts', '.ios.jsx', '.ios.js', '.tsx', '.ts', '.jsx', '.js', '.json']`
- React Native source mirroring plus Flow stripping before execution
- package-root-based resolution for Yarn PnP and regular installs

### 2. Global bootstrap

The runtime installs the same core globals the preset expects:

- `IS_REACT_ACT_ENVIRONMENT`
- `IS_REACT_NATIVE_TEST_ENVIRONMENT`
- `__DEV__`
- `window`
- `nativeFabricUIManager`
- `performance.now`
- `requestAnimationFrame`
- `cancelAnimationFrame`
- `nativeModuleProxy`
- `__turboModuleProxy`
- `__fbBatchedBridgeConfig`
- `globalThis.jest` bridge backed by `vi`

### 3. Explicit `react-native/jest/setup.js`-style subpath mocks

The runtime explicitly mocks these subpaths:

- `react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo`
- `react-native/Libraries/Core/InitializeCore`
- `react-native/Libraries/Core/NativeExceptionsManager`
- `react-native/Libraries/Components/Clipboard/Clipboard`
- `react-native/Libraries/Components/RefreshControl/RefreshControl`
- `react-native/Libraries/Components/ActivityIndicator/ActivityIndicator`
- `react-native/Libraries/Image/Image`
- `react-native/Libraries/Text/Text`
- `react-native/Libraries/Components/TextInput/TextInput`
- `react-native/Libraries/Modal/Modal`
- `react-native/Libraries/Components/View/View`
- `react-native/Libraries/Components/ScrollView/ScrollView`
- `react-native/Libraries/BatchedBridge/NativeModules`
- `react-native/Libraries/ReactNative/UIManager`
- `react-native/Libraries/AppState/AppState`
- `react-native/Libraries/Linking/Linking`
- `react-native/Libraries/Vibration/Vibration`
- `react-native/Libraries/NativeComponent/NativeComponentRegistry`
- `react-native/Libraries/ReactNative/requireNativeComponent`
- `react-native/Libraries/Components/View/ViewNativeComponent`
- `react-native/Libraries/Utilities/useColorScheme`
- `react-native/Libraries/ReactNative/RendererProxy`

### 4. Native bridge / `NativeModules` parity

The installed `nativeModuleProxy` includes these native-facing modules:

- `AlertManager`
- `AsyncLocalStorage`
- `BlobModule`
- `DevSettings`
- `DeviceInfo`
- `I18nManager`
- `ImageLoader`
- `ImageViewManager`
- `KeyboardObserver`
- `NativeAnimatedModule`
- `Networking`
- `PlatformConstants`
- `PushNotificationManager`
- `SourceCode`
- `StatusBarManager`
- `Timing`
- `UIManager`
- `WebSocketModule`

### 5. Top-level `react-native` facade

The top-level `react-native` mock exports these components, APIs, and utilities:

- `AccessibilityInfo`
- `ActivityIndicator`
- `ActionSheetIOS`
- `Alert`
- `Animated`
- `Appearance`
- `AppRegistry`
- `AppState`
- `BackHandler`
- `Button`
- `Clipboard`
- `DevMenu`
- `DevSettings`
- `DeviceEventEmitter`
- `DeviceInfo`
- `Dimensions`
- `DrawerLayoutAndroid`
- `DynamicColorIOS`
- `Easing`
- `experimental_LayoutConformance`
- `findNodeHandle`
- `FlatList`
- `I18nManager`
- `Image`
- `ImageBackground`
- `InputAccessoryView`
- `InteractionManager`
- `Keyboard`
- `KeyboardAvoidingView`
- `LayoutAnimation`
- `Linking`
- `LogBox`
- `Modal`
- `NativeAppEventEmitter`
- `NativeDialogManagerAndroid`
- `NativeEventEmitter`
- `NativeModules`
- `Networking`
- `PanResponder`
- `PermissionsAndroid`
- `PixelRatio`
- `Platform`
- `PlatformColor`
- `Pressable`
- `processColor`
- `ProgressBarAndroid`
- `PushNotificationIOS`
- `RefreshControl`
- `registerCallableModule`
- `requireNativeComponent`
- `RootTagContext`
- `SafeAreaView`
- `ScrollView`
- `SectionList`
- `Settings`
- `Share`
- `StatusBar`
- `StyleSheet`
- `Switch`
- `Systrace`
- `Text`
- `TextInput`
- `ToastAndroid`
- `Touchable`
- `TouchableHighlight`
- `TouchableNativeFeedback`
- `TouchableOpacity`
- `TouchableWithoutFeedback`
- `TurboModuleRegistry`
- `UIManager`
- `unstable_batchedUpdates`
- `useAnimatedValue`
- `useColorScheme`
- `useWindowDimensions`
- `UTFSequence`
- `Vibration`
- `View`
- `VirtualizedList`
- `VirtualizedSectionList`

### 6. Removed React Native exports

The runtime also preserves the removed-export getters that throw when accessed:

- `ART`
- `AsyncStorage`
- `CameraRoll`
- `CheckBox`
- `DatePickerAndroid`
- `DatePickerIOS`
- `ImageEditor`
- `ImagePickerIOS`
- `ImageStore`
- `ListView`
- `MaskedViewIOS`
- `NetInfo`
- `Picker`
- `PickerIOS`
- `ProgressViewIOS`
- `SegmentedControlIOS`
- `Slider`
- `StatusBarIOS`
- `SwipeableListView`
- `TimePickerAndroid`
- `ToolbarAndroid`
- `ViewPagerAndroid`
- `WebView`

## Behavioral Notes

The runtime also reproduces the host rendering semantics that RNTL depends on:

- host components render to string host nodes such as `View`, `Text`, `TextInput`, `ScrollView`
- native components preserve `_nativeTag` and native-style instance methods
- `requireNativeComponent()` and `NativeComponentRegistry` resolve to host-renderable mock components
- `Animated` includes the preset-style mock surface, including `Value`, `ValueXY`, `Color`, `Interpolation`, `Node`, `timing`, `spring`, `decay`, `sequence`, `parallel`, `stagger`, `loop`, arithmetic helpers, `event`, `attachNativeEvent`, `forkEvent`, `unforkEvent`, and `Event`

For the source of truth, see [src/reactNativeRuntime.ts](./src/reactNativeRuntime.ts), [src/runtimeBootstrap.ts](./src/runtimeBootstrap.ts), and [src/reactNative.ts](./src/reactNative.ts).
