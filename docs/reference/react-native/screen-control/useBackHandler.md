---
sourcePath: packages/react-native/src/use-back-event/useBackHandler.tsx
---

# useBackHandler

A Hook that registers back handlers which intercept back navigation. Using this Hook, you can handle a back action differently depending on conditions — for example, closing an overlay first instead of leaving the screen when the back button is pressed.

This Hook replaces the deprecated [useBackEvent](./useBackEvent). Back handlers run before handlers registered through `useBackEvent`.

Use `addEventListener` to register a handler. Registering a handler returns a subscription object, and calling its `remove` method removes the handler.

When a back action occurs (back button, iOS swipe gesture, or Android hardware back press), registered handlers run in reverse registration order — the most recently registered handler runs first. Each handler receives a `BackEvent` object containing the `source` of the back action.

The handler's return value decides whether the back action continues.

- Return `true` to stop the back action there. The remaining handlers do not run, and the default back navigation does not run either.
- Return `false` or return nothing to pass the back action to the next handler.

Registered handlers are only active while the user is viewing the screen. Whether the screen is visible is determined using [useVisibility](./useVisibility).

## Signature

```typescript
function useBackHandler(): BackHandlerControls;
```

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">BackHandlerControls</span>
    <br />
    <p class="post-parameters--description">An object that registers back handlers. Use the <code>addEventListener</code> method to register a handler of type <code>(event: BackEvent) =&gt; boolean | void</code>. This method returns a subscription object with a <code>remove</code> method, and calling <code>remove</code> removes the registered handler.</p>
  </li>
</ul>

### Error

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">Error</span>
    <br />
    <p class="post-parameters--description">Throws an error if this hook is not used within a <code>BackEventProvider</code>.</p>
  </li>
</ul>

## Example

### Example of Closing an Overlay First

- **While the overlay is open, pressing the back button closes the overlay instead of navigating back.** The handler returns `true`, so the back action stops there.
- **While the overlay is closed, pressing the back button navigates back normally as per default behavior.** The handler returns nothing, so the back action continues.

```tsx
import { useEffect, useState } from 'react';
import { Button, View } from 'react-native';
import { useBackHandler } from '@granite-js/react-native';

export function OverlayExample() {
  const backHandler = useBackHandler();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  useEffect(() => {
    const subscription = backHandler.addEventListener(() => {
      if (isOverlayOpen) {
        setIsOverlayOpen(false);
        return true;
      }

      return undefined;
    });

    return () => {
      subscription.remove();
    };
  }, [backHandler, isOverlayOpen]);

  return (
    <View>
      <Button title="Open Overlay" onPress={() => setIsOverlayOpen(true)} />
    </View>
  );
}
```
