---
sourcePath: packages/react-native/src/native-modules/natives/closeView.ts
---

# closeView

현재 화면을 닫는 함수에요. 예를 들어, "닫기" 버튼을 눌러서 서비스를 종료할 때 사용할 수 있어요.

## 시그니처

```typescript
function closeView(): Promise<void>;
```

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">Promise&lt;void&gt;</span>
    <br />
    <p class="post-parameters--description"></p>
  </li>
</ul>

## 예제

### 닫기 버튼을 눌러 화면 닫기

```tsx
import { Button } from 'react-native';
import { closeView } from '@granite-js/react-native';

function CloseButton() {
  return <Button title="닫기" onPress={closeView} />;
}
```
