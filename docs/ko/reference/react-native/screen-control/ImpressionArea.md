---
sourcePath: packages/react-native/src/impression-area/ImpressionArea.tsx
---

# ImpressionArea

특정 컴포넌트가 화면에 보이는지 여부를 감지해서 외부에 알려주는 컴포넌트예요. 이 컴포넌트를 사용해서 화면에 특정 컴포넌트가 보이면 로그를 수집하거나 애니메이션을 실행하는 구현을 쉽게 할 수 있어요.
화면에 보이는지 여부는 `useVisibility`의 반환값과 뷰포트(Viewport) 내에 표시되었는 지 알려주는 `IOScrollView`와 `InView` 컴포넌트로 감지해요. React에서 `ScrollView`를 사용하면 뷰가 화면에 보이지 않더라도, `ImpressionArea`를 사용하면 해당 뷰가 실제로 화면에 보일때만 이벤트를 발생시킬 수 있어요.

::: info 유의하세요

`ImpressionArea`는 반드시 `IOScrollView` 안에서 사용해야 해요. 만약 `IOScrollView` 외부에서 사용해야 한다면, `UNSAFE__impressFallbackOnMount` 속성을 `true`로 설정해서 컴포넌트가 마운트될 때를 기준으로 감지할 수 있어요. 이 속성이 `false`로 설정된 상태에서 `IOScrollView` 외부에서 사용하면 `IOProviderMissingError`가 발생해요.

:::

## 시그니처

```typescript
function ImpressionArea(props: Props): ReactElement;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onImpressionStart</span><span class="post-parameters--type">() =&gt; void</span>
    <br />
    <p class="post-parameters--description">자식 컴포넌트가 화면에 보일 때 실행되는 콜백함수예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onImpressionEnd</span><span class="post-parameters--type">() =&gt; void</span>
    <br />
    <p class="post-parameters--description">자식 컴포넌트가 화면에 가려졌을 때 실행되는 콜백함수예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">enabled</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">true</span>
    <br />
    <p class="post-parameters--description">화면에 보여졌다는 조건을 직접 제어하는 값이에요. 기본값은 <code>true</code> 에요. <code>false</code> 로 전달하면 화면에 보여져도 <code>onImpressionStart</code> 콜백 함수가 실행되지 않아요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">areaThreshold</span><span class="post-parameters--type">number</span> · <span class="post-parameters--default">0</span>
    <br />
    <p class="post-parameters--description">보여지는 영역의 비율을 설정하는 값이에요. 이 값보다 큰 비율로 컴포넌트가 화면에 나타나면 <code>onImpressionStart</code>를 호출해요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">timeThreshold</span><span class="post-parameters--type">number</span> · <span class="post-parameters--default">0</span>
    <br />
    <p class="post-parameters--description">이 컴포넌트가 화면에 보인 후 <code>onImpressionStart</code> 호출될 때까지의 시간을 밀리초 단위로 설정해요.기본값은 <code>0</code>밀리초(0초)에요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">style</span><span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description"><code>InView</code> 컴포넌트에 적용할 <code>style</code> 값이에요. 기본값은 <code>undefined</code>이고, <code>style</code>을 지정하고 싶을 때 사용해요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">UNSAFE__impressFallbackOnMount</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
    <br />
    <p class="post-parameters--description">컴포넌트가 마운트될 때 즉시 화면에 나타난 것으로 간주할지 여부예요. 기본값은 <code>false</code>예요.</p>
  </li>
</ul>

값은 0부터 1 사이의 숫자로 설정하며, 0으로 설정하면 컴포넌트의 1px이라도 보일 때 이벤트가 발생해요. 반대로, 1로 설정하면 컴포넌트가 100% 화면에 노출될 때만 이벤트가 호출돼요.`IOScrollView`를 사용하지 않는 상황에서, 컴포넌트가 뷰포트(Viewport) 안에 있는지 판단할 수 없을 떼 유용해요. 예를 들어, `IOScrollView` 밖에 위치한 컴포넌트는 `true`로 설정하면 마운트 시점에 보여졌다고 판단해요.

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">ReactElement</span>
    <br />
    <p class="post-parameters--description">화면에 보이는 여부를 감지할 수 있는 컴포넌트가 반환돼요.</p>
  </li>
</ul>

## 예제

### 기본 사용 예시

```tsx
import { useState } from 'react';
import { Button, Dimensions, Text, View } from 'react-native';
import { ImpressionArea, IOScrollView } from '@granite-js/react-native';

export default function ImpressionAreaExample() {
  const [isImpressionStart, setIsImpressionStart] = useState(false);

  return (
    <>
      <Text>{isImpressionStart ? 'Impression Start' : 'Impression End'}</Text>
      <IOScrollView
        style={{
          flex: 1,
          margin: 16,
          backgroundColor: 'white',
        }}
      >
        <View
          style={{
            height: Dimensions.get('screen').height,
            borderWidth: 1,
            borderColor: 'black',
          }}
        >
          <Text>Scroll to here</Text>
        </View>

        <ImpressionArea
          onImpressionStart={() => setIsImpressionStart(true)}
          onImpressionEnd={() => setIsImpressionStart(false)}
        >
          <Button title="Button" />
        </ImpressionArea>
      </IOScrollView>
    </>
  );
}
```

### 마운트 시점에 감지하는 예시

`ImpressionArea`가 `IOScrollView`와 같은 컴포넌트 내부에 위치하지 않을 때, `UNSAFE__impressFallbackOnMount`를 `true`로 설정하면 컴포넌트가 마운트될 때 화면에 보여진 것으로 간주해요.

```tsx
import { useState } from 'react';
import { Button, Dimensions, ScrollView, Text, View } from 'react-native';
import { ImpressionArea } from '@granite-js/react-native';

export default function ImpressionArea2Example() {
  const [isImpressionStart, setIsImpressionStart] = useState(false);

  return (
    <>
      <Text>{isImpressionStart ? 'Impression Start' : 'Impression End'}</Text>
      <ScrollView
        style={{
          flex: 1,
          margin: 16,
          backgroundColor: 'white',
        }}
      >
        <View
          style={{
            height: Dimensions.get('screen').height,
            borderWidth: 1,
            borderColor: 'black',
          }}
        >
          <Text>Scroll to here</Text>
        </View>

        <ImpressionArea
          UNSAFE__impressFallbackOnMount={true}
          onImpressionStart={() => setIsImpressionStart(true)}
          onImpressionEnd={() => setIsImpressionStart(false)}
        >
          <Button title="Button" />
        </ImpressionArea>
      </ScrollView>
    </>
  );
}
```
