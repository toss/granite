---
sourcePath: packages/react-native/src/scroll-view-inertial-background/ScrollViewInertialBackground.tsx
---

# ScrollViewInertialBackground

iOS `ScrollView` 콘텐츠의 위, 아래 공간에 배경색을 추가해서, 스크롤 했을 때 자연스러운 시각 효과를 제공해요.
iOS에서는 스크롤이 끝에 도달했을 때 살짝 튕기는 듯한 [Bounce 효과](https://medium.com/@wcandillon/ios-bounce-list-effect-with-react-native-5102e3a83999)가 발생해요. 이때 콘텐츠 위, 아래 공간에 배경색을 설정하면 더 일관된 유저 경험을 제공할 수 있어요.

## 시그니처

```typescript
function ScrollViewInertialBackground({
  topColor,
  bottomColor,
  spacer: _spacer,
}: ScrollViewInertialBackgroundProps): import('react/jsx-runtime').JSX.Element;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">컴포넌트에 전달되는 <code>props</code> 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.topColor</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">스크롤 위쪽 영역에 적용할 배경색이에요. 기본값은 시스템 테마에 맞춰 자동으로 적용되는 <code>adaptive.background</code>에요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.bottomColor</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">스크롤 아래쪽 영역에 적용할 배경색이에요. 기본값은 시스템 테마에 맞춰 자동으로 적용되는 <code>adaptive.background</code>에요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.spacer</span><span class="post-parameters--type">number</span>
        <br />
        <p class="post-parameters--description">배경색이 적용될 콘텐츠 위, 아래 공간 사이의 공간 크기를 지정해요. 기본값은 <a href="https://reactnative.dev/docs/next/usewindowdimensions" target="_blank" rel="noreferrer">`useWindowDimensions`</a>로 가져온 화면 높이를 사용해요.</p>
      </li>
    </ul>
  </li>
</ul>

## 예제

### 스크롤 뷰 위, 아래에 배경색을 추가하기

스크롤 뷰 위에 빨간색, 아래에 파란색 배경색을 추가해요. 스크롤을 벗어난 영역에 배경색이 적용돼요.

```tsx
import { ScrollView, View, Text } from 'react-native';
import { ScrollViewInertialBackground } from '@granite-js/react-native';

const dummies = Array.from({ length: 20 }, (_, i) => i);

export function InertialBackgroundExample() {
  return (
    <ScrollView>
      <ScrollViewInertialBackground topColor="red" bottomColor="blue" />
      {dummies.map((i) => (
        <View
          key={`dummy-${i}`}
          style={{ width: '100%', height: 100, borderBottomColor: 'black', borderBottomWidth: 1 }}
        >
          <Text>스크롤을 해보세요.</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```
