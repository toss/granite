---
sourcePath: packages/react-native/src/visibility/useVisibilityChange.ts
---

# useVisibilityChange

화면의 보이는 상태가 변경될 때 해당 상태를 전달하는 콜백 함수를 호출해요.
이 콜백 함수에는 [useVisibility](/ko/reference/react-native/screen-control/useVisibility)의 반환값이 전달돼요. 반환값이 `true`이면 `visible`, `false`이면 `hidden` 문자열이 전달돼요.

## 시그니처

```typescript
function useVisibilityChange(callback: VisibilityCallback): void;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">callback</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">VisibilityCallback</span>
    <br />
    <p class="post-parameters--description">화면이 보이는지 여부가 바뀔 때 그 변경을 전달하는 콜백 함수를 호출해요.</p>
  </li>
</ul>

## 예제

### 화면의 보이는 상태가 변경될 때 로그를 남기는 예제

```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useVisibilityChange, VisibilityState } from '@granite-js/react-native';

export function UseVisibilityChangeExample() {
  const [visibilityHistory, setVisibilityHistory] = useState<VisibilityState[]>([]);

  useVisibilityChange((visibility) => {
    setVisibilityHistory((prev) => [...prev, visibility]);
  });

  return (
    <View>
      <Text>홈 화면으로 나갔다 들어오면 로그가 남겨져요.</Text>

      {visibilityHistory.map((visibility, index) => (
        <Text key={index}>{JSON.stringify(visibility)}</Text>
      ))}
    </View>
  );
}
```
