---
sourcePath: packages/react-native/src/keyboard/KeyboardAboveView.tsx
---
# KeyboardAboveView



키보드가 화면에 나타날 때 자식 컴포넌트를 키보드 위로 자동으로 올려주는 컴포넌트예요.
예를 들어, 텍스트 입력 중 "전송" 버튼을 키보드 위에 고정시키고 싶을 때 유용해요.

## 시그니처

```typescript
function KeyboardAboveView({ style, children, ...props }: ComponentProps<typeof View>): ReactElement;
```



### 파라미터
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props.style</span><span class="post-parameters--type">StyleProp&lt;ViewStyle&gt;</span>
    <br />
    <p class="post-parameters--description">추가적인 스타일을 적용할 수 있어요. 예를 들어, 배경색이나 크기 등을 설정할 수 있어요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props.children</span><span class="post-parameters--type">ReactNode</span>
    <br />
    <p class="post-parameters--description">키보드가 나타날 때 키보드 위로 표시할 컴포넌트예요. 예를 들어, 버튼, 텍스트 입력창 등을 넣을 수 있어요.</p>
  </li>
</ul>






### 반환 값
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">ReactElement</span>
    <br />
    <p class="post-parameters--description">키보드가 나타났을 때 키보드 위로 조정된 <a href="https://reactnative.dev/docs/animated#createanimatedcomponent" target="_blank" rel="noreferrer">`Animated.View`</a>를 반환해요.</p>
  </li>
</ul>






## 예제

### 키보드 위로 요소를 올리기

```tsx
import { ScrollView, TextInput, View, Text } from 'react-native';
import { KeyboardAboveView } from '@granite-js/react-native';

export function KeyboardAboveViewExample() {
  return (
    <>
      <ScrollView>
        <TextInput placeholder="placeholder" />
      </ScrollView>

      <KeyboardAboveView>
        <View style={{ width: '100%', height: 50, backgroundColor: 'yellow' }}>
          <Text>Keyboard 위에 있어요.</Text>
        </View>
      </KeyboardAboveView>
    </>
  );
}
```