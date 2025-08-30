---
sourcePath: packages/style-utils/src/flex.tsx
---

# FlexCenterVertical

`Flex.CenterVertical`는 자식 요소들을 [**Flexbox 레이아웃**](https://reactnative.dev/docs/0.72/flexbox) 기준으로 **세로 방향으로 중앙에 정렬**하기 위한 컴포넌트예요.
`justifyContent` 속성이 `'center'`로 설정되어, 자식 요소들이 부모 컴포넌트의 세로 중앙에 배치돼요.

## 시그니처

```typescript
FlexCenterVertical: import('react').ForwardRefExoticComponent<Props & import('react').RefAttributes<View>>;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">컴포넌트에 전달되는 props 객체예요.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.align</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;stretch&#39; | &#39;baseline&#39;</span> · <span class="post-parameters--default">&#39;center&#39;</span>
        <br />
        <p class="post-parameters--description">중심축 기준(Flex 방향)으로 자식 요소를 정렬하는 설정 값이에요. <code>&#39;column&#39;</code> 방향을 예로 들어, <code>&#39;center&#39;</code>는 수평 중앙에 배치하고, <code>&#39;stretch&#39;</code>는 요소의 폭이 <code>&#39;auto&#39;</code>인 경우 부모의 폭에 맞게 늘려요. 이 값은 <a href="https://reactnative.dev/docs/0.72/layout-props#alignitems" target="_blank" rel="noreferrer">`alignItems`</a>에 적용되며, 기본값은 <code>&#39;stretch&#39;</code>예요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.justify</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;space-between&#39; | &#39;space-around&#39; | &#39;space-evenly&#39;</span> · <span class="post-parameters--default">&#39;center&#39;</span>
        <br />
        <p class="post-parameters--description">교차축(Flex 방향의 교차 방향) 기준으로 자식 요소를 정렬하는 설정 값이에요. <code>&#39;column&#39;</code> 방향을 예로 들어, <code>flex-start</code>는 요소를 부모의 위쪽에 배치하고, <code>&#39;center&#39;</code>는 부모의 수직 중앙에 배치해요. 이 값은 <a href="https://reactnative.dev/docs/0.72/layout-props#justifycontent" target="_blank" rel="noreferrer">`justifyContent`</a>에 적용되며, 기본값은 <code>&#39;center&#39;</code>예요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.direction</span><span class="post-parameters--type">&#39;column&#39; | &#39;row&#39;</span> · <span class="post-parameters--default">&#39;column&#39;</span>
        <br />
        <p class="post-parameters--description">자식 요소들이 배치될 방향을 설정하는 값이에요. 기본값은 <code>&#39;column&#39;</code>으로, 세로 방향으로 배치돼요.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.style</span><span class="post-parameters--type">ViewProps[&#39;style&#39;]</span>
        <br />
        <p class="post-parameters--description"><code>Flex.CenterVertical</code> 컴포넌트에 적용할 <code>style</code> 객체예요. Flexbox 레이아웃 외에 컴포넌트의 배경색, 테두리, 여백 등 다른 스타일을 지정할 때 사용해요. 기본값은 <code>undefined</code>에요.</p>
      </li>
    </ul>
  </li>
</ul>

## 예제

### 세로 방향으로 요소들을 중앙 정렬하는 예제예요.

```tsx
import { Flex } from '@granite-js/react-native';
import { Text } from 'react-native';

function FlexCenterVerticalExample() {
  return (
    <Flex.CenterVertical style={{ width: '100%', height: 100, borderWidth: 1 }}>
      <Text>세로 중앙에 배치해요</Text>
    </Flex.CenterVertical>
  );
}
```
