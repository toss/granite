---
sourcePath: packages/react-native/src/blur/BlurView.tsx
---

# BlurView

`BlurView` 컴포넌트는 iOS에서 배경을 블러 처리하는 UI 효과를 줘요. 이 컴포넌트는 배경을 흐리게 표시해요. iOS에서만 지원되고
Android에서는 기본 [`View`](https://reactnative.dev/docs/0.72/view) 를 렌더링해요.

블러의 강도를 조절할 수 있고, [Vibrancy 효과](https://developer.apple.com/documentation/uikit/uivibrancyeffect?language=objc)를 적용할 수 있어요. 블러가 적용되지 않을 경우에는 [`reducedTransparencyFallbackColor`](https://github.com/Kureev/react-native-blur/tree/v4.3.2?tab=readme-ov-file#blurview)를 사용해 배경색을 설정할 수 있어요.

`isSupported` 속성을 통해 현재 기기에서 블러가 지원되는지 확인할 수 있어요. iOS 5.126.0 이상에서만 블러 효과가 지원되고, Android에서는 지원되지 않아요.

## 시그니처

```typescript
function BlurView({
  blurType,
  blurAmount,
  reducedTransparencyFallbackColor,
  vibrancyEffect,
  ...viewProps
}: BlurViewProps): import('react/jsx-runtime').JSX.Element;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">BlurViewProps</span>
    <br />
    <p class="post-parameters--description"><code>BlurView</code>에 전달할 속성들이에요. <code>react-native</code>의 <code>ViewProps</code>를 상속하므로, 기본적인 레이아웃 속성도 함께 사용할 수 있어요. <a href="https://github.com/Kureev/react-native-blur/tree/v4.3.2?tab=readme-ov-file#blurview" target="_blank" rel="noreferrer">@react-native-community/blur</a> 의 속성과 같아요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.blurType</span><span class="post-parameters--type">BlurType</span>
        <br />
        <p class="post-parameters--description">블러의 유형을 설정해요. <code>light</code>, <code>dark</code>, <code>extraLight</code> 같은 값을 사용해 블러의 스타일을 정의할 수 있어요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.blurAmount</span><span class="post-parameters--type">number</span> · <span class="post-parameters--default">10</span>
        <br />
        <p class="post-parameters--description">블러의 강도를 설정해요. 숫자가 클수록 블러가 더 강하게 적용돼요. 기본값은 <code>10</code>이에요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.vibrancyEffect</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
        <br />
        <p class="post-parameters--description">Vibrancy Effect를 활성화해요. Vibrancy 효과는 블러된 배경 위의 콘텐츠를 더 생동감 있게 보이도록 해줘요. iOS에서만 지원되며, 기본값은 <code>false</code>예요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.reducedTransparencyFallbackColor</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">투명도가 제한될 경우 사용할 대체 배경색이에요. 블러가 지원되지 않거나 제대로 렌더링되지 않을 때 유용해요.</p>
      </li>
    </ul>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">viewProps</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewProps</span>
    <br />
    <p class="post-parameters--description">기본적으로 전달할 수 있는 <code>View</code>의 속성들이에요. 레이아웃이나 스타일링을 위해 추가할 수 있어요.</p>
  </li>
</ul>

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">JSX.Element</span>
    <br />
    <p class="post-parameters--description">iOS에서는 블러가 적용된 <code>BlurView</code> 또는 <code>VibrancyView</code> 컴포넌트를 반환하고, Android에서는 기본 <code>View</code>를 반환해요.</p>
  </li>
</ul>

::: warning 유의할 점

- `BlurView`는 iOS에서만 지원돼요. Android에서는 기본 `View`가 렌더링되며, 블러 효과가 적용되지 않아요.
  :::

## 예제

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

## 참고

- [iOS Vibrancy Effect Documentation](https://developer.apple.com/documentation/uikit/uivibrancyeffect)
- [Zeddios Blog 설명](https://zeddios.tistory.com/1140)
