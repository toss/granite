---
sourcePath: packages/react-native/src/use-back-event/useBackEvent.tsx
---

# useBackEvent

A Hook that returns a controller object for registering and removing back events. Using this Hook, you can handle back events only when a specific component is active.
Use `addEventListener` to register back events and `removeEventListener` to remove them.
Registered back events are only active when the user is viewing the screen. The condition for viewing the screen is determined using [useVisibility](./useVisibility).

Using this Hook, you can define logic to handle back events in specific components.

## Signature

```typescript
function useBackEvent(): BackEventControls;
```

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">BackEventControls</span>
    <br />
    <p class="post-parameters--description">An object that can control back events. This object includes the <code>addEventListener</code> method for registering events and the <code>removeEventListener</code> method for removing them.</p>
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

### Example of Registering and Removing Back Events

- **When the "Add BackEvent" button is pressed, a back event is registered.** After that, pressing the back button shows an alert with "back" and prevents actual navigation.
- **When the "Remove BackEvent" button is pressed, the registered event is removed.** After that, pressing the back button navigates back normally as per default behavior.

```tsx
import { useEffect, useState } from 'react';
import { Alert, Button, View } from 'react-native';
import { useBackEvent } from '@granite-js/react-native';

export function UseBackEventExample() {
  const backEvent = useBackEvent();

  const [handler, setHandler] = useState<{ callback: () => void } | undefined>(undefined);

  useEffect(() => {
    const callback = handler?.callback;

    if (callback != null) {
      backEvent.addEventListener(callback);

      return () => {
        backEvent.removeEventListener(callback);
      };
    }

    return;
  }, [backEvent, handler]);

  return (
    <View>
      <Button
        title="Add BackEvent"
        onPress={() => {
          setHandler({ callback: () => Alert.alert('back') });
        }}
      />
      <Button
        title="Remove BackEvent"
        onPress={() => {
          setHandler(undefined);
        }}
      />
    </View>
  );
}
```
