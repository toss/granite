---
sourcePath: packages/react-native/src/visibility/useVisibility.tsx
---

# useVisibility

Returns whether the screen is visible to the user.
Returns `true` if the app's screen is currently visible to the user, and `false` if it's not. However, the screen visibility state does not change when opening and closing the system share modal (share).

Usage examples:

- Returns `false` when switching to another app or pressing the home button.
- Returns `true` when returning to the granite app or when the screen becomes visible.
- Returns `false` when navigating to another service within the granite app.

## Signature

```typescript
function useVisibility(): boolean;
```

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">boolean</span>
    <br />
    <p class="post-parameters--description">Whether the current screen is visible to the user.</p>
  </li>
</ul>

## Example

### Example of checking screen visibility

```tsx
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useVisibility } from '@granite-js/react-native';

export function UseVisibilityExample() {
  const visibility = useVisibility();

  useEffect(() => {
    console.log({ visibility });
  }, [visibility]);

  return <Text>Logs are created when leaving and returning to the home screen.</Text>;
}
```
