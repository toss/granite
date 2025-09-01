---
sourcePath: packages/style-utils/src/stack.tsx
---

# Stack

`Stack`은 자식 요소들을 Stack 방식으로 가로 혹은 세로로 배치하고, 자식 요소 사이에 간격을 설정할 수 있는 컴포넌트예요.
`direction` 속성으로 가로(`horizontal`) 또는 세로(`vertical`) 방향을 지정할 수 있고, 자식 요소들 사이의 간격을 `gutter` 속성으로 조절할 수 있어요.
가로로 배치할 때는 `Stack.Horizontal`, 세로로 배치할 때는 `Stack.Vertical` 컴포넌트를 사용할 수 있어요.

## 시그니처

```typescript
Stack: StackType;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">컴포넌트에 전달되는 props 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.align</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;stretch&#39; | &#39;baseline&#39;</span>
        <br />
        <p class="post-parameters--description">중심축 기준(Flex 방향)으로 자식 요소를 정렬하는 설정 값이에요. <code>&#39;column&#39;</code> 방향을 예로 들면 <code>&#39;center&#39;</code>는 수평 중앙에 배치하고, <code>&#39;stretch&#39;</code>는 요소의 폭이 <code>&#39;auto&#39;</code>인 경우 부모의 폭에 맞게 늘려요. 이 값은 <a href="https://reactnative.dev/docs/0.72/layout-props#alignitems" target="_blank" rel="noreferrer">`alignItems`</a>에 적용돼요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.justify</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;space-between&#39; | &#39;space-around&#39; | &#39;space-evenly&#39;</span>
        <br />
        <p class="post-parameters--description">교차축(Flex 방향의 교차 방향) 기준으로 자식 요소를 정렬하는 설정 값이에요. <code>&#39;column&#39;</code> 방향을 예로 들어, <code>flex-start</code>는 요소를 부모의 위쪽에 배치하고, <code>&#39;center&#39;</code>는 부모의 수직 중앙에 배치해요. 이 값은 <a href="https://reactnative.dev/docs/0.72/layout-props#justifycontent" target="_blank" rel="noreferrer">`justifyContent`</a>에 적용돼요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.direction</span><span class="post-parameters--type">&#39;vertical&#39; | &#39;horizontal&#39;</span> · <span class="post-parameters--default">&#39;vertical&#39;</span>
        <br />
        <p class="post-parameters--description">자식 요소를 배치할 방향을 설정하는 값이에요. 기본값은 <code>&#39;vertical&#39;</code>이에요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.gutter</span><span class="post-parameters--type">number | ReactElement</span>
        <br />
        <p class="post-parameters--description">자식 요소 간의 간격을 설정하는 값이에요. 숫자를 입력하면 픽셀 단위로 여백을 설정하고, <code>ReactElement</code>를 전달하면 해당 컴포넌트가 간격으로 사용돼요. 숫자를 사용하면 간격을 정확하게 제어할 수 있고, <code>ReactElement</code>를 사용하면 더 복잡한 커스텀 간격을 구현할 수 있어요.</p>
      </li>
    </ul>
  </li>
</ul>

### 프로퍼티

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">Horizontal</span><span class="post-parameters--type">StackHorizontal</span>
    <br />
    <p class="post-parameters--description"><code>Stack.Horizontal</code>은 자식 요소들을 <strong>가로 방향</strong>으로 정렬하여 쌓는 컴포넌트예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">Vertical</span><span class="post-parameters--type">StackVertical</span>
    <br />
    <p class="post-parameters--description"><code>Stack.Vertical</code>은 자식 요소들을 <strong>세로 방향</strong>으로 정렬하여 쌓는 컴포넌트예요.</p>
  </li>
</ul>

## 예제

### 가로, 세로 방향으로 요소들을 배치하고 간격을 16으로 설정한 예제예요.

```tsx
import { Text } from 'react-native';
import { Stack } from '@granite-js/react-native';

export function StackExample() {
  return (
    <>
      <Stack gutter={16} direction="horizontal">
        <Text>16간격을 두고 가로 방향으로 배치해요</Text>
        <Text>1</Text>
        <Text>2</Text>
        <Text>3</Text>
      </Stack>
      <Stack gutter={16} direction="vertical">
        <Text>16간격을 두고 세로 방향으로 배치해요</Text>
        <Text>1</Text>
        <Text>2</Text>
        <Text>3</Text>
      </Stack>
    </>
  );
}
```
