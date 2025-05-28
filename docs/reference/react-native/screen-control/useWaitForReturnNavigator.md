---
sourcePath: packages/react-native/src/react/useWaitForReturnNavigator.ts
---

# useWaitForReturnNavigator

A Hook that helps execute the next code synchronously when returning from a screen transition.
Screen navigation uses [@react-navigation/native `useNavigation`'s `navigate`](https://reactnavigation.org/docs/6.x/navigation-prop#navigate).

For example, it can be used when you want to log that a user has navigated to another screen and returned.

## Signature

```typescript
function useWaitForReturnNavigator<T extends Record<string, object | undefined>>(): <RouteName extends keyof T>(
  route: RouteName,
  params?: T[RouteName]
) => Promise<void>;
```

## Example

### Example of code execution when returning from screen navigation

When the **"Navigate"** button is pressed, it navigates to another screen, and logs are created when returning.

```tsx
import { Button } from 'react-native';
import { useWaitForReturnNavigator } from '@granite-js/react-native';

export function UseWaitForReturnNavigator() {
  const navigate = useWaitForReturnNavigator();

  return (
    <>
      <Button
        title="Navigate"
        onPress={async () => {
          console.log(1);
          await navigate('/examples/use-visibility');
          // This code executes when returning to the screen
          console.log(2);
        }}
      />
    </>
  );
}
```
