---
sourcePath: packages/react-native/src/native-modules/natives/closeView.ts
---

# closeView

Function that closes the current screen. It can be used when you want to exit a service by pressing a "Close" button.

## Signature

```typescript
function closeView(): Promise<void>;
```

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">Promise&lt;void&gt;</span>
    <br />
    <p class="post-parameters--description"></p>
  </li>
</ul>

## Example

### Close screen with close button

```tsx
import { Button } from 'react-native';
import { closeView } from '@granite-js/react-native';

function CloseButton() {
  return <Button title="Close" onPress={closeView} />;
}
```
