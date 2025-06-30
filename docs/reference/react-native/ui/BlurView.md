---
sourcePath: packages/react-native/src/blur/BlurView.tsx
---

# BlurView

`BlurView` adds a blurred background effect, primarily on iOS. It creates a visual blur on the background view.

This component is supported only on iOS. On Android, it simply renders a regular [`View`](https://reactnative.dev/docs/0.72/view) without any blur effect.

You can control the blur intensity and optionally enable the [vibrancy effect](https://developer.apple.com/documentation/uikit/uivibrancyeffect?language=objc), which enhances the visual impact of content displayed over a blurred background.

If blur is not supported or doesn't render properly, you can use the `reducedTransparencyFallbackColor` prop to set a fallback background color.

Use the `isSupported` property to check whether the current device supports blur. Blur is available on iOS from version 5.126.0 and not supported on Android.

## Signature

```typescript
function BlurView({
  blurType,
  blurAmount,
  reducedTransparencyFallbackColor,
  vibrancyEffect,
  ...viewProps
}: BlurViewProps): import('react/jsx-runtime').JSX.Element;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">BlurViewProps</span>
    <br />
    <p class="post-parameters--description">The props you can pass to <code>BlurView</code>. It extends <code>react-native</code>&#39;s <code>ViewProps</code>, so you can use layout and style properties. The props align with those of <a href="https://github.com/Kureev/react-native-blur/tree/v4.3.2?tab=readme-ov-file#blurview" target="_blank" rel="noreferrer">`@react-native-community/blur`</a>.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.blurType</span><span class="post-parameters--type">BlurType</span>
        <br />
        <p class="post-parameters--description">Type of blur to apply, such as <code>light</code>, <code>dark</code>, or <code>extraDark</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.blurAmount</span><span class="post-parameters--type">number</span> · <span class="post-parameters--default">10</span>
        <br />
        <p class="post-parameters--description">Intensity of the blur effect. Higher values make the blur stronger. Accepts values from <code>0</code> to <code>100</code>. Default is <code>10</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.vibrancyEffect</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
        <br />
        <p class="post-parameters--description">Enables the vibrancy effect. This effect enhances content displayed on top of the blur. Only supported on iOS. Default is <code>false</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.reducedTransparencyFallbackColor</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">Fallback background color used when blur cannot be applied due to system settings or device limitations.</p>
      </li>
    </ul>
  </li>
</ul>

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">JSX.Element</span>
    <br />
    <p class="post-parameters--description">On iOS, returns a blurred <code>BlurView</code> or <code>VibrancyView</code> component. On Android, returns a regular <code>View</code> without blur.</p>
  </li>
</ul>

::: warning Note
`BlurView` is only supported on iOS. On Android, it renders a regular `View` without any blur effect.
:::

## Example

### Blurring background behind a text

```tsx
import { BlurView } from '@granite-js/react-native';
import { View, Text, StyleSheet } from 'react-native';

export function BlurViewExample() {
  return (
    <View style={styles.container}>
      <Text style={styles.absolute}>Blurred Text</Text>
      <BlurView style={styles.absolute} blurType="light" blurAmount={1} />
      <Text>Non Blurred Text</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 300,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
});
```

## References

- [iOS Vibrancy Effect Documentation](https://developer.apple.com/documentation/uikit/uivibrancyeffect)
- [Zeddios Blog Explanation](https://zeddios.tistory.com/1140)
