---
sourcePath: packages/react-native/src/native-modules/natives/openURL.ts
---

# openURL

지정된 URL을 기기의 기본 브라우저나 관련 앱에서 열어요.
이 함수는 `react-native`의 [`Linking.openURL`](https://reactnative.dev/docs/0.72/linking#openurl) 메서드를 사용하여 URL을 열어요.

## 시그니처

```typescript
function openURL(url: string): Promise<any>;
```

### 파라미터

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">url</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">string</span>
    <br />
    <p class="post-parameters--description">열고자 하는 URL 주소</p>
  </li>
</ul>

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">Promise&lt;any&gt;</span>
    <br />
    <p class="post-parameters--description">URL이 성공적으로 열렸을 때 해결되는 Promise</p>
  </li>
</ul>

## 예제

### 외부 URL 열기

```tsx
import { openURL } from '@granite-js/react-native';
import { Button } from 'react-native';

function Page() {
  const handlePress = () => {
    openURL('https://google.com');
  };

  return <Button title="구글 웹사이트 열기" onPress={handlePress} />;
}
```
