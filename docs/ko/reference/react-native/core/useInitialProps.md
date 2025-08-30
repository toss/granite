---
sourcePath: packages/react-native/src/app/context/InitialPropsContext.tsx
---

# useInitialProps

React Native 앱에서 특정 화면에 진입할 때 네이티브(Android 또는 iOS)가 전달한 초기 데이터를 객체로 알려줘요. 이 데이터를 사용해 앱 실행 직후 테마나 사용자 설정을 바로 적용할 수 있어요. 예를 들어 네이티브에서 다크 모드를 사용하고 있다는 설정을 받아서 React Native 앱이 실행되면 다크 모드로 바로 사용할 수 있어요.

## 시그니처

```typescript
function useInitialProps<T extends InitialProps>(): T;
```

### 반환 값

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">InitialProps</span>
    <br />
    <p class="post-parameters--description">앱의 초기 데이터</p>
  </li>
</ul>

## 예제

### 초기 데이터로 다크 모드 여부 확인하기

```tsx
import { useInitialProps } from '@granite-js/react-native';

function Page() {
  const initialProps = useInitialProps();
  // 'light' 또는 'dark'
  console.log(initialProps.initialColorPreference);
  return <></>;
}
```
