---
sourcePath: packages/react-native/src/native-modules/natives/getSchemeUri.ts
---

# getSchemeUri

Returns the scheme value when first entering the screen. URI changes due to page navigation are not reflected.

## Signature

```typescript
function getSchemeUri(): string;
```

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">string</span>
    <br />
    <p class="post-parameters--description">Returns the scheme value when first entering the screen.</p>
  </li>
</ul>

## Example

### Get initial scheme value

```tsx
import { getSchemeUri } from '@granite-js/react-native';
import { Text } from 'react-native';

function MyPage() {
  const schemeUri = getSchemeUri();

  return <Text>Initial scheme value: {schemeUri}</Text>;
}
```
