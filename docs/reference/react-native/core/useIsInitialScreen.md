---
sourcePath: packages/react-native/src/router/hooks/useIsInitialScreen.ts
---
# useIsInitialScreen

A hook that checks whether the current screen is the first screen in the navigation stack.
Internally, it uses `useNavigationState` to check if the current stack's `index` is 0.
Use this when you want to conditionally display a back button or show specific guidance messages only on the initial screen.

## Signature

```typescript
function useIsInitialScreen(): boolean;
```

### Return Value
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">boolean</span>
    <br />
    <p class="post-parameters--description">Returns <code>true</code> if the current screen is the first screen in the navigation stack, otherwise returns <code>false</code>.</p>
  </li>
</ul>

## Examples

### Display a Welcome Message Only on the Initial Screen

An example that shows a welcome message only when entering the first screen.

```tsx
import { useIsInitialScreen } from '@granite-js/react-native';
import { Text, View } from 'react-native';

function MyScreen() {
  const isInitialScreen = useIsInitialScreen();

  return (
    <View>
      {isInitialScreen && (
        <Text>Welcome! This is the initial screen.</Text>
      )}
      <Text>Screen content</Text>
    </View>
  );
}
```