---
sourcePath: packages/react-native/src/app/Granite.tsx
---

# Granite

앱 컴포넌트를 등록하고 네이티브 초기 props와 visibility 생명주기를 제공해요. 라우팅은 선택적이며 앱 안에서 Router를 직접 렌더링해야 해요.

```tsx
import { Granite, type InitialProps } from '@granite-js/react-native/core';

function App(props: InitialProps) {
  return <MyContent colorPreference={props.initialColorPreference} />;
}

export default Granite.registerApp(App, { appName: 'my-app' });
```

[Router 구성과 마이그레이션](/ko/guides/granite-router/routing#앱-안에서-router-렌더링하기)
