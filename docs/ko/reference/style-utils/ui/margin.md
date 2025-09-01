---
sourcePath: packages/style-utils/src/box-spacing.tsx
---

# margin

`margin` 함수는 컴포넌트의 외부 간격을 설정해서, 컴포넌트들 간의 적절한 간격을 확보해요. 가로(x), 세로(y), 그리고 각 방향(top, right, bottom, left)별로 외부 여백을 숫자로 지정할 수 있어요.
숫자를 입력하면 모든 방향에 동일한 값을 적용하거나, 각 방향별로 개별 설정이 가능해요. 또한 자주 쓰는 값에 대한 프리셋이 있어 쉽게 적용할 수 있어요.

## 시그니처

```typescript
margin: BoxSpacing;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">option</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">BoxSpacingOption</span>
    <br />
    <p class="post-parameters--description">바깥쪽 여백을 지정하는 옵션 값이예요. 숫자를 넣으면 모든 방향에 동일한 값을 적용하고,</p>
  </li>
</ul>

각 방향에 대해 개별 값을 설정할 수도 있어요.

### 프로퍼티

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">컴포넌트의 가로 방향(왼쪽과 오른쪽)에 입력한 숫자만큼의 바깥쪽 여백을 설정하는 스타일 객체를 반환해요. 반환된 객체는 컴포넌트의 <code>style</code> 속성에 전달되어 여백이 적용돼요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x4</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">가로 방향에 4px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x8</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">가로 방향에 8px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x12</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">가로 방향에 12px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x16</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">가로 방향에 16px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x24</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">가로 방향에 24px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x32</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">가로 방향에 32px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">컴포넌트의 세로 방향(위쪽과 아래쪽)에 입력한 숫자만큼의 바깥쪽 여백을 설정하는 스타일 객체를 반환해요. 반환된 객체는 컴포넌트의 <code>style</code> 속성에 전달되어 여백이 적용돼요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y4</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">세로 방향에 4px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y8</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">세로 방향에 8px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y12</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">세로 방향에 12px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y16</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">세로 방향에 16px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y24</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">세로 방향에 24px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y32</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">세로 방향에 32px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">컴포넌트의 위쪽 방향에 입력한 숫자만큼의 바깥쪽 여백을 설정하는 스타일 객체를 반환해요. 반환된 객체는 컴포넌트의 <code>style</code> 속성에 전달되어 여백이 적용돼요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top4</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">위에 4px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top8</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">위에 8px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top12</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">위에 12px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top16</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">위에 16px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top24</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">위에 24px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top32</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">위에 32px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">컴포넌트의 오른쪽 방향에 입력한 숫자만큼의 바깥쪽 여백을 설정하는 스타일 객체를 반환해요. 반환된 객체는 컴포넌트의 <code>style</code> 속성에 전달되어 여백이 적용돼요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right4</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">오른쪽에 4px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right8</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">오른쪽에 8px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right12</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">오른쪽에 12px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right16</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">오른쪽에 16px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right24</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">오른쪽에 24px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right32</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">오른쪽에 32px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">컴포넌트의 아래쪽 방향에 입력한 숫자만큼의 바깥쪽 여백을 설정하는 스타일 객체를 반환해요. 반환된 객체는 컴포넌트의 <code>style</code> 속성에 전달되어 여백이 적용돼요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom4</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">아래에 4px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom8</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">아래에 8px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom12</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">아래에 12px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom16</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">아래에 16px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom24</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">아래에 24px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom32</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">아래에 32px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">컴포넌트의 왼쪽 방향에 입력한 숫자만큼의 바깥쪽 여백을 설정하는 스타일 객체를 반환해요. 반환된 객체는 컴포넌트의 <code>style</code> 속성에 전달되어 여백이 적용돼요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left4</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">왼쪽에 4px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left8</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">왼쪽에 8px의 바깥쪽 여백을 적용하는 스타일 객체예요</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left12</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">왼쪽에 12px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left16</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">왼쪽에 16px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left24</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">왼쪽에 24px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left32</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">왼쪽에 32px의 바깥쪽 여백을 적용하는 스타일 객체예요.</p>
  </li>
</ul>

### 예제

## 가로, 세로 방향에 8px의 바깥쪽 여백을 적용하고, 아래 방향에 임의의 여백(100px)을 적용하는 예제예요.

```tsx
import { margin } from '@granite-js/react-native';
import { View } from 'react-native';

function Component() {
  return (
    <View>
      <View style={margin.x8}>
        <Text>가로 여백이 있어요</Text>
      </View>
      <View style={margin.y8}>
        <Text>세로 여백이 있어요</Text>
      </View>
      <View style={margin.bottom(100)}>
        <Text>아래에 100만큼의 여백이 있어요</Text>
      </View>
    </View>
  );
}
```
