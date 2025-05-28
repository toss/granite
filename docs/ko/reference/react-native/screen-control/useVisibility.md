---
sourcePath: packages/react-native/src/visibility/useVisibility.tsx
---

# useVisibility

화면이 사용자에게 보이는 상태인지 여부를 반환해요.
앱의 화면이 현재 사용자에게 보인다면 `true`를 반환하고, 보이지 않는다면 `false`를 반환해요. 단, 시스템 공유하기 모달([share](/ko/reference/react-native/share/share))을 열고 닫을 때는 화면이 보이는 상태가 바뀌지 않아요.

사용 예시는 다음과 같아요.

- 다른 앱으로 전환하거나 홈 버튼을 누르면 `false` 를 반환해요.
- 다시 토스 앱으로 돌아오거나 화면이 보이면 `true` 를 반환해요.
- 토스 앱 내 다른 서비스로 이동하면 `false` 를 반환해요.

## 시그니처

```typescript
function useVisibility(): boolean;
```

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">boolean</span>
    <br />
    <p class="post-parameters--description">현재 화면이 사용자에게 보이는지 여부에요.</p>
  </li>
</ul>

## 예제

### 화면이 보이는 상태를 확인하는 예제

```tsx
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useVisibility } from '@granite-js/react-native';

export function UseVisibilityExample() {
  const visibility = useVisibility();

  useEffect(() => {
    console.log({ visibility });
  }, [visibility]);

  return <Text>홈 화면으로 나갔다 들어오면 로그가 남겨져요.</Text>;
}
```
