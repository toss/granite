---
sourcePath: 'packages/react-native/src/router/components/useRouterBackHandler.tsx'
---

# useRouterBackHandler

A hook that provides a handler for handling back navigation actions. This can be used when you need to close a view directly when the back button is pressed in modals or independent screens where there's no navigation stack. This hook uses `NavigationContainerRef` from `@react-navigation/native` to navigate to the previous screen if there's a remaining navigation stack, or executes the user-defined `onClose` function if the stack is empty.

## Signature

```typescript
function useRouterBackHandler({
  navigationContainerRef,
  onClose,
}: {
  navigationContainerRef: NavigationContainerRefWithCurrent<never>;
  onClose?: () => void;
}): { handler: any };
```

### Parameters

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">navigationContainerRef</span><span class="post-parameters--required">Required</span> · <span class="post-parameters--type">NavigationContainerRefWithCurrent&lt;any&gt;</span>
    <br/>
    <p class="post-parameters--description">A <code>NavigationContainerRef</code> that can reference the current navigation state. Used when executing back navigation actions.</p>
  </li>
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onClose</span> · <span class="post-parameters--type">() =&gt; void</span>
    <br/>
    <p class="post-parameters--description">A function to execute when the navigation stack is empty. For example, you can pass a function that closes a React Native View.</p>
  </li>
</ul>

### Returns

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">{ handler: () =&gt; void }</span>
    <br/>
    <p class="post-parameters--description">A handler function that can be used in back buttons or similar components.
</p>
  </li>
</ul>

## Examples

### Example of directly passing a handler to a back button and setting a function to close the view

```tsx
import { createNavigationContainerRef, useNavigation } from '@granite-js/native/@react-navigation/native';
import { BackButton, useRouterBackHandler } from '@granite-js/react-native';
import { useEffect } from 'react';

const navigationContainerRef = createNavigationContainerRef();

function MyBackButton() {
  const navigation = useNavigation();

  const { handler } = useRouterBackHandler({
    navigationContainerRef,
    onClose: () => {
      // close the view
    },
  });

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => <BackButton onPress={handler} />,
    });
  }, [handler, navigation]);

  return <></>;
}
```
