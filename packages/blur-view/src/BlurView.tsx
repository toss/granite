import type { BlurViewProps as InternalBlurViewProps } from '@granite-js/native/@react-native-community/blur';
import { View, ViewProps } from 'react-native';
import { ReactNativeBlurModule } from './ReactNativeBlurModule';
import { isBlurNativeModuleSupported } from './constants';

export type BlurType = InternalBlurViewProps['blurType'];

export interface BlurViewProps extends ViewProps {
  blurType?: BlurType;
  blurAmount?: number;
  vibrancyEffect?: boolean;
  reducedTransparencyFallbackColor?: string;
}

/**
 * @public
 * @category UI
 * @name BlurView
 * @description
 * `BlurView` adds a blurred background effect, primarily on iOS. It creates a visual blur on the background view.
 *
 * This component is supported only on iOS. On Android, it simply renders a regular [`View`](https://reactnative.dev/docs/0.72/view) without any blur effect.
 *
 * You can control the blur intensity and optionally enable the [vibrancy effect](https://developer.apple.com/documentation/uikit/uivibrancyeffect?language=objc), which enhances the visual impact of content displayed over a blurred background.
 *
 * If blur is not supported or doesn't render properly, you can use the `reducedTransparencyFallbackColor` prop to set a fallback background color.
 *
 * Use the `isSupported` property to check whether the current device supports blur. Blur is available on iOS from version 5.126.0 and not supported on Android.
 *
 * @param {BlurViewProps} [props] The props you can pass to `BlurView`. It extends `react-native`'s `ViewProps`, so you can use layout and style properties. The props align with those of [`@react-native-community/blur`](https://github.com/Kureev/react-native-blur/tree/v4.3.2?tab=readme-ov-file#blurview).
 * @param {BlurType} [props.blurType] Type of blur to apply, such as `light`, `dark`, or `extraDark`.
 * @param {number} [props.blurAmount=10] Intensity of the blur effect. Higher values make the blur stronger. Accepts values from `0` to `100`. Default is `10`.
 * @param {boolean} [props.vibrancyEffect=false] Enables the vibrancy effect. This effect enhances content displayed on top of the blur. Only supported on iOS. Default is `false`.
 * @param {string} [props.reducedTransparencyFallbackColor] Fallback background color used when blur cannot be applied due to system settings or device limitations.
 *
 * @returns {JSX.Element} On iOS, returns a blurred `BlurView` or `VibrancyView` component. On Android, returns a regular `View` without blur.
 *
 * ::: warning Note
 * `BlurView` is only supported on iOS. On Android, it renders a regular `View` without any blur effect.
 * :::
 *
 * @example
 *
 * ### Blurring background behind a text
 *
 * ```tsx
 * import { BlurView } from '@granite-js/react-native';
 * import { View, Text, StyleSheet } from 'react-native';
 *
 * export function BlurViewExample() {
 *   return (
 *     <View style={styles.container}>
 *       <Text style={styles.absolute}>Blurred Text</Text>
 *       <BlurView style={styles.absolute} blurType="light" blurAmount={1} />
 *       <Text>Non Blurred Text</Text>
 *     </View>
 *   );
 * }
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     justifyContent: 'center',
 *     alignItems: 'center',
 *     width: '100%',
 *     height: 300,
 *   },
 *   absolute: {
 *     position: 'absolute',
 *     top: 0,
 *     left: 0,
 *     bottom: 0,
 *     right: 0,
 *   },
 * });
 * ```
 *
 * @see [iOS Vibrancy Effect Documentation](https://developer.apple.com/documentation/uikit/uivibrancyeffect)
 * @see [Zeddios Blog Explanation](https://zeddios.tistory.com/1140)
 */
export function BlurView({
  blurType,
  blurAmount = 10,
  reducedTransparencyFallbackColor,
  vibrancyEffect = false,
  ...viewProps
}: BlurViewProps) {
  if (!isBlurNativeModuleSupported || ReactNativeBlurModule == null) {
    return <View {...viewProps} />;
  }

  const Component = vibrancyEffect ? ReactNativeBlurModule.VibrancyView : ReactNativeBlurModule.BlurView;

  return (
    <Component
      blurAmount={blurAmount}
      blurType={blurType}
      reducedTransparencyFallbackColor={reducedTransparencyFallbackColor}
      {...viewProps}
    />
  );
}

BlurView.isSupported = isBlurNativeModuleSupported;
