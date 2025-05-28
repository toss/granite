---
sourcePath: packages/react-native/src/visibility/useVisibilityChange.ts
---

# useVisibilityChange

Calls a callback function with the visibility state when the screen's visibility changes.
The callback function receives the return value from [useVisibility](/en/reference/react-native/Screen%20Control/useVisibility). If the return value is `true`, it passes 'visible', and if `false`, it passes 'hidden'.

## Signature

```typescript
function useVisibilityChange(callback: VisibilityCallback): void;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">callback</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">VisibilityCallback</span>
    <br />
    <p class="post-parameters--description">Calls a callback function that receives visibility changes when the screen&#39;s visibility changes.</p>
  </li>
</ul>

## Example

### Example of logging when screen visibility changes

```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useVisibilityChange, VisibilityState } from '@granite-js/react-native';

export function UseVisibilityChangeExample() {
  const [visibilityHistory, setVisibilityHistory] = useState<VisibilityState[]>([]);

  useVisibilityChange((visibility) => {
    setVisibilityHistory((prev) => [...prev, visibility]);
  });

  return (
    <View>
      <Text>Logs are created when leaving and returning to the home screen.</Text>

      {visibilityHistory.map((visibility, index) => (
        <Text key={index}>{JSON.stringify(visibility)}</Text>
      ))}
    </View>
  );
}
```
