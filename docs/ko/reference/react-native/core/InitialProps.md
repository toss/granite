---
sourcePath: packages/react-native/src/initial-props/InitialProps.ts
---

# InitialProps

React Native 앱에서 사용자가 특정 화면에 진입할 때,
네이티브 플랫폼(Android/iOS)이 앱으로 전달하는 초기 데이터 타입을 제공해요.
초기 데이터는 화면 초기화에 사용되는 중요한 정보를 포함하고 있고, 네이티브 플랫폼별로 필요한 데이터 타입이 달라요.

Android에서 제공하는 데이터 타입은 `AndroidInitialProps`이고, iOS에서 제공하는 데이터 타입은 `IOSInitialProps` 이에요.

## 시그니처

```typescript
type InitialProps = AndroidInitialProps | IOSInitialProps;
```

### 프로퍼티

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">platform</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">&#39;ios&#39; | &#39;android&#39;</span>
    <br />
    <p class="post-parameters--description">현재 앱이 실행 중인 플랫폼이에요. <code>ios</code> 또는 <code>android</code> 값을 가져요.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">initialColorPreference</span><span class="post-parameters--required">필수</span> · <span class="post-parameters--type">ColorPreference</span>
    <br />
    <p class="post-parameters--description">초기 컬러 테마예요. 사용자가 설정한 컬러 테마를 나타내요.</p>
  </li>
</ul>

## 예제

### `InitialProps`를 사용하는 예제

::: code-group

```tsx [_app.tsx]
import { PropsWithChildren } from 'react';
import { Granite, InitialProps } from '@granite-js/react-native';
import { context } from '../require.context';

const APP_NAME = 'my-app-name';

function AppContainer({ children, ...initialProps }: PropsWithChildren<InitialProps>) {
  console.log({ initialProps });
  return <>{children}</>;
}

export default Granite.registerApp(AppContainer, {
  appName: APP_NAME,
  context,
});
```

:::
