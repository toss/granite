---
sourcePath: packages/react-native/src/native-modules/natives/openURL.ts
---

# openURL

Opens the specified URL in the device's default browser or related app.
This function uses the [`Linking.openURL`](https://reactnative.dev/docs/0.72/linking#openurl) method from `react-native` to open the URL.

## Signature

```typescript
function openURL(url: string): Promise<any>;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">url</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">string</span>
    <br />
    <p class="post-parameters--description">URL address to open</p>
  </li>
</ul>

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">Promise&lt;any&gt;</span>
    <br />
    <p class="post-parameters--description">Promise that resolves when the URL is successfully opened</p>
  </li>
</ul>

## Example

### Open external URL

```tsx
import { openURL } from '@granite-js/react-native';
import { Button } from 'react-native';

function Page() {
  const handlePress = () => {
    openURL('https://google.com');
  };

  return <Button title="Open Google Website" onPress={handlePress} />;
}
```
