---
sourcePath: packages/react-native/src/app/context/InitialPropsContext.tsx
---

# useInitialProps

Provides initial data passed from the native platform (Android or iOS) when entering a specific screen in React Native apps. This data can be used to immediately apply themes or user settings right after app launch. For example, you can receive dark mode settings from the native platform and apply dark mode immediately when the React Native app starts.

## Signature

```typescript
function useInitialProps<T extends InitialProps>(): T;
```

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">InitialProps</span>
    <br />
    <p class="post-parameters--description">Initial data for the app</p>
  </li>
</ul>

## Example

### Checking dark mode status with initial data

```tsx
import { useInitialProps } from '@granite-js/react-native';

function Page() {
  const initialProps = useInitialProps();
  // 'light' or 'dark'
  console.log(initialProps.initialColorPreference);
  return <></>;
}
```
