---
sourcePath: 'packages/react-native/src/router/components/BackButton.tsx'
---

# BackButton

A back button component. This component is primarily used to implement functionality for returning to the previous screen in navigation headers or custom screen tops. If no `onPress` handler is set, it won't perform any action.

## Signature

```typescript
function BackButton({ tintColor, onPress }: BackButtonProps): any;
```

### Parameters

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--required">Required</span> · <span class="post-parameters--type">Object</span>
    <br/>
    <p class="post-parameters--description"></p>
    <ul class="post-parameters-ul">
  <li class="post-parameters-li ">
    <span class="post-parameters--name">tintColor</span> · <span class="post-parameters--type">string</span>
    <br/>
    <p class="post-parameters--description">The color of the button icon. You can use CSS color strings.</p>
  </li>
  <li class="post-parameters-li ">
    <span class="post-parameters--name">onPress</span> · <span class="post-parameters--type">() =&gt; void</span>
    <br/>
    <p class="post-parameters--description">A function to execute when the button is pressed. For example, you can add a function to return to the previous screen.</p>
  </li>
    </ul>
  </li>
</ul>

### Returns

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">ReactElement</span>
    <br/>
    <p class="post-parameters--description">Returns a back button component.</p>
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
    closeFn: () => {
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
