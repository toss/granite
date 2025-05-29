---
sourcePath: packages/style-utils/src/stack.tsx
---
# StackVertical



`Stack.Vertical`은 자식 요소를 세로로 쌓아 배치하는 컴포넌트에요. 이 컴포넌트를 사용하면 자식 요소 간의 간격을 `gutter` 속성으로 쉽게 조절할 수 있어, 세로 방향으로 일관된 레이아웃을 유지할 수 있어요.

## 시그니처

```typescript
StackVertical: import("react").ForwardRefExoticComponent<StackWithoutDirectionProps & import("react").RefAttributes<View>>
```



### 파라미터
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">컴포넌트에 전달되는 props 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.align</span><span class="post-parameters--type">string</span> · <span class="post-parameters--default">&#39;stretch&#39;</span>
        <br />
        <p class="post-parameters--description">자식 요소의 세로 정렬을 설정하는 값이에요. Flexbox의 <code>align-items</code> 속성과 동일하게 동작하며, 기본값은 <code>&#39;stretch&#39;</code>로 자식 요소의 높이가 <code>&#39;auto&#39;</code>인 경우 부모의 높이에 맞춰 늘어나요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.justify</span><span class="post-parameters--type">string</span> · <span class="post-parameters--default">&#39;flex-start&#39;</span>
        <br />
        <p class="post-parameters--description">자식 요소의 가로 정렬을 설정하는 값이에요. Flexbox의 <code>justify-content</code> 속성과 동일하게 동작하며, 기본값은 <code>&#39;flex-start&#39;</code>로 자식 요소들이 왼쪽에 정렬돼요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.gutter</span><span class="post-parameters--type">number | ReactElement</span>
        <br />
        <p class="post-parameters--description">자식 요소 간의 간격을 설정하는 값이에요. 숫자를 입력하면 픽셀 단위로 여백을 설정하고, <code>ReactElement</code>를 전달하면 해당 컴포넌트가 간격으로 사용돼요. 숫자를 사용하면 간격을 정확하게 제어할 수 있고, <code>ReactElement</code>를 사용하면 더 복잡한 커스텀 간격을 구현할 수 있어요.</p>
      </li>
    </ul>
  </li>
</ul>










## 예제

### 가로 방향으로 요소들을 배치하고 간격으로 16만큼 설정한 예제예요.

```tsx
import { Stack } from '@granite-js/react-native';
import { View, Text } from 'react-native';

```tsx
import { Stack } from '@granite-js/react-native';
import { View, Text } from 'react-native';

function StackVerticalExample() {
  return (
       <Stack.Vertical gutter={16}>
        <Text>16간격을 두고 세로 방향으로 배치해요</Text>
        <Text>1</Text>
        <Text>2</Text>
        <Text>3</Text>
      </Stack.Vertical>
  );
}
```