---
sourcePath: packages/style-utils/src/spacing.tsx
---

# Spacing

`Spacing`은 빈 공간을 차지해서 여백을 추가하는 컴포넌트예요. 가로 혹은 세로 방향으로 여백의 크기를 지정할 수 있어요.

## 시그니처

```typescript
Spacing: import('react').NamedExoticComponent<Props>;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">컴포넌트에 전달되는 <code>props</code> 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.size</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">number</span>
        <br />
        <p class="post-parameters--description">여백의 크기를 설정하는 숫자 값이에요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.direction</span><span class="post-parameters--type">&#39;vertical&#39; | &#39;horizontal&#39;</span> · <span class="post-parameters--default">&#39;vertical&#39;</span>
        <br />
        <p class="post-parameters--description">여백을 차지할 방향을 설정해요. 기본값은 <code>&#39;vertical&#39;</code>이에요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.style</span><span class="post-parameters--type">StyleProp&lt;ViewStyle&gt;</span>
        <br />
        <p class="post-parameters--description"><code>Spacing</code> 컴포넌트에 적용할 <code>style</code> 값이에요. 기본값은 <code>undefined</code>이고, 추가 스타일을 적용할 때 사용돼요.</p>
      </li>
    </ul>
  </li>
</ul>

## 예제

### 가로, 세로 방향에 크기가 `16`인 여백을 추가하여 빈 공간을 만들어 낸 예제

```tsx
import { View, Text } from 'react-native';
import { Spacing } from '@granite-js/react-native';

export function SpacingExample() {
  return (
    <View>
      <Text>Top</Text>
      <Spacing size={16} direction="vertical" style={{ backgroundColor: 'red', width: 5 }} />
      <Text>Bottom, 세로 여백만큼 아래에 위치해 있어요</Text>

      <View style={{ flexDirection: 'row' }}>
        <Text>Left</Text>
        <Spacing size={16} direction="horizontal" style={{ backgroundColor: 'red', height: 5 }} />
        <Text>Right, 가로 여백만큼 옆에 위치해 있어요</Text>
      </View>
    </View>
  );
}
```
