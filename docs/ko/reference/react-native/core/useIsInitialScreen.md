---
sourcePath: packages/react-native/src/router/hooks/useIsInitialScreen.ts
---

# useIsInitialScreen

현재 화면이 네비게이션 스택의 첫 번째 화면인지 확인하는 Hook이에요.
내부적으로 `useNavigationState`를 사용해서 현재 스택의 `index`가 0인지 확인해요.
예를 들어, 뒤로가기 버튼을 조건부로 표시하거나 첫 화면에서만 특정 안내 메시지를 보여주고 싶을 때 사용해요.

## 시그니처

```typescript
function useIsInitialScreen(): boolean;
```

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">boolean</span>
    <br />
    <p class="post-parameters--description">현재 화면이 네비게이션 스택의 첫 번째 화면이면 <code>true</code>, 아니면 <code>false</code>를 반환해요.</p>
  </li>
</ul>

## 예제

### 첫 화면에서만 안내 메시지 표시하기

첫 화면에 진입했을 때만 환영 메시지를 보여주는 예제예요.

```tsx
import { useIsInitialScreen } from '@granite-js/react-native';
import { Text, View } from 'react-native';

function MyScreen() {
  const isInitialScreen = useIsInitialScreen();

  return (
    <View>
      {isInitialScreen && <Text>환영합니다! 첫 화면입니다.</Text>}
      <Text>화면 내용</Text>
    </View>
  );
}
```
