---
sourcePath: packages/react-native/src/app/context/useInitialSearchParams.tsx
---

# useInitialSearchParams

A hook that returns the query parameters from the URL passed when the app is first launched, directly as an object. This allows immediate application of initial entry handling like login or theme settings, enabling quick customization of user experience. If an invalid URL is provided, it safely returns an empty object. When the native platform (Android or iOS) passes a URL with query parameters to the app on first launch, you can easily read each parameter value using this hook.

## Signature

```typescript
function useInitialSearchParams(): {
  [k: string]: string;
};
```

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">Record&lt;string, string&gt;</span>
    <br />
    <p class="post-parameters--description">An object containing key-value pairs of query parameters from the initial URL. Returns an empty object if there are no query parameters or if the URL is invalid.</p>
  </li>
</ul>

## Example

```tsx
import { useInitialSearchParams } from '@granite-js/react-native';

function Page() {
  const params = useInitialSearchParams();
  // Example: if initial URL is myapp://home?userId=42&theme=dark
  console.log(params.userId); // "42"
  console.log(params.theme); // "dark"
  return <></>;
}
```
