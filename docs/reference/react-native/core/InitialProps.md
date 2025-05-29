---
sourcePath: packages/react-native/src/initial-props/InitialProps.ts
---

# InitialProps

Provides the initial data type that native platforms (Android/iOS) pass to the app when a user enters a specific screen in a React Native app.
The initial data contains important information used for screen initialization, and the required data types differ by native platform.

The data type provided by Android is `AndroidInitialProps`, and the data type provided by iOS is `IOSInitialProps`.

## Signature

```typescript
type InitialProps = AndroidInitialProps | IOSInitialProps;
```

### Property

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">platform</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">&#39;ios&#39; | &#39;android&#39;</span>
    <br />
    <p class="post-parameters--description">The platform on which the app is currently running. Has a value of either <code>ios</code> or <code>android</code>.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">initialColorPreference</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ColorPreference</span>
    <br />
    <p class="post-parameters--description">The initial color theme. Represents the color theme set by the user.</p>
  </li>
</ul>

## Example

### Example using `InitialProps`

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
