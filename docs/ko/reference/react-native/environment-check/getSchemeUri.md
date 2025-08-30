---
sourcePath: packages/react-native/src/native-modules/natives/getSchemeUri.ts
---

# getSchemeUri

처음에 화면에 진입한 스킴 값이에요. 페이지 이동으로 인한 URI 변경은 반영되지 않아요.

## 시그니처

```typescript
function getSchemeUri(): string;
```

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">string</span>
    <br />
    <p class="post-parameters--description">처음에 화면에 진입한 스킴 값을 반환해요.</p>
  </li>
</ul>

## 예제

### 처음 진입한 스킴 값 가져오기

```tsx
import { getSchemeUri } from '@granite-js/react-native';
import { Text } from 'react-native';

function MyPage() {
  const schemeUri = getSchemeUri();

  return <Text>처음에 화면에 진입한 스킴 값: {schemeUri}</Text>;
}
```
