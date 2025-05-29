---
sourcePath: packages/react-native/src/app/Granite.tsx
---

# Granite

## Signature

```typescript
Granite: {
    registerApp(AppContainer: ComponentType<PropsWithChildren<InitialProps>>, { appName, context, router }: GraniteProps): (initialProps: InitialProps) => JSX.Element;
    readonly appName: string;
}
```

### Property

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">registerApp</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">RegisterService</span>
    <br />
    <p class="post-parameters--description">This function sets up the basic environment for your service and helps you start service development quickly without needing complex configuration. By just passing <code>appName</code>, you can immediately use various features such as file-based routing, query parameter handling, and back navigation control.</p>
  </li>
</ul>

The features provided by the `Granite.registerApp` function are as follows:

- Routing: URLs are automatically mapped according to file paths. It works similarly to Next.js's file-based routing. For example, the `/my-service/pages/index.ts` file can be accessed at `scheme://my-service`, and the `/my-service/pages/home.ts` file can be accessed at `scheme://my-service/home`.
- Query Parameters: You can easily use query parameters received through URL schemes. For example, you can receive a `referrer` parameter and log it.
- Back Navigation Control: You can control back navigation events. For example, when a user presses back on a screen, you can show a dialog or close the screen.
- Screen Visibility: You can determine whether a screen is visible or hidden from the user. For example, you can use this value to handle specific actions when a user leaves for the home screen.

## Example

### Example of creating with the `Granite` component

```tsx
import { PropsWithChildren } from 'react';
import { Granite, InitialProps } from '@granite-js/react-native';
import { context } from '../require.context';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return <>{children}</>;
}

export default Granite.registerApp(AppContainer, {
  appName: 'my-app',
  context,
});
```
