---
sourcePath: packages/react-native/src/app/Granite.tsx
---

# Granite

Registers the app component with native initial props and visibility lifecycle. Routing is optional and must be rendered explicitly inside the app.

```tsx
import { Granite, type InitialProps } from '@granite-js/react-native/core';

function App(props: InitialProps) {
  return <MyContent colorPreference={props.initialColorPreference} />;
}

export default Granite.registerApp(App, { appName: 'my-app' });
```

[Router composition and migration](/guides/granite-router/routing#render-router-inside-your-app)
