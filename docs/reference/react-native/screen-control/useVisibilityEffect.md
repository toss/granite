---
sourcePath: packages/react-native/src/visibility/useVisibilityEffect.ts
---

# useVisibilityEffect

Runs an effect while the screen is visible according to [useVisibility](./useVisibility). The effect may return a cleanup function, which runs when the screen becomes hidden, the effect callback changes, or the component unmounts.

## Signature

```typescript
function useVisibilityEffect(effect: EffectCallback): void;
```

`effect` is a synchronous function that optionally returns a cleanup function, with the same callback type as React's `useEffect`. Start asynchronous work inside the callback instead of passing an async callback.

## Lifecycle

- When mounted visible, the effect runs after the render is committed. It does not run when mounted hidden.
- When visibility changes to hidden, the active effect is cleaned up. It runs again when visibility returns.
- If the callback identity changes while visible, the previous effect is cleaned up before the new callback runs.
- Unmounting cleans up the active effect even if no hidden state was rendered first.
- React Strict Mode may perform an additional setup and cleanup cycle in development.

Use `useCallback` with the dependencies needed by the effect to avoid restarting on unrelated renders.

## Example

```tsx
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useVisibilityEffect } from '@granite-js/react-native';

function Screen({ onBack }: { onBack: () => boolean }) {
  useVisibilityEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => subscription.remove();
    }, [onBack])
  );

  return null;
}
```

## Choosing a visibility hook

- [useVisibility](./useVisibility) returns the current visibility state.
- [useVisibilityChange](./useVisibilityChange) is deprecated. It reports `'visible'` and `'hidden'` transitions. Its callback does not register a cleanup function.
- `useVisibilityEffect` manages an effect for the time the screen is visible, including cleanup.

Unlike React Navigation's `useFocusEffect`, this hook also considers the native screen visibility represented by `useVisibility`. It can therefore clean up when a native screen covers the current screen, even if the route remains focused. Setup and cleanup follow React's effect timing rather than running synchronously in navigation event listeners.
