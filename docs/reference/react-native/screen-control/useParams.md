---
sourcePath: packages/react-native/src/router/createRoute.ts
---

# useParams

`useParams` is a hook that retrieves parameters from a specified route.
Using this hook, you can easily access parameters of the current route.
With the `validateParams` option, you can validate parameter structure and transform types,
reducing runtime errors and writing safer code.

## Signature

```typescript
function useParams<TScreen extends keyof RegisterScreen>(options: {
  from: TScreen;
  strict?: true;
}): RegisterScreen[TScreen];
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">options</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">RouteHooksOptions&lt;TScreen&gt;</span>
    <br />
    <p class="post-parameters--description">Object containing information about the route to retrieve.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">options.from</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">Route path to retrieve parameters from. If not specified, retrieves parameters from the current route. Must be specified when strict mode is true.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">options.strict</span><span class="post-parameters--type">boolean</span>
        <br />
        <p class="post-parameters--description">Strict mode setting. When set to true, throws an error if the specified route doesn&#39;t match the current route. When set to false, skips validateParams validation and returns parameters of the current screen as is.</p>
      </li>
    </ul>
  </li>
</ul>

## Example

### Retrieving Route Parameters

::: code-group

```tsx [pages/examples/use-params.tsx]
import React from 'react';
import { Text } from 'react-native';
import { createRoute, useParams } from '@granite-js/react-native';

export const Route = createRoute('/examples/use-params', {
  validateParams: (params) => params as { id: string },
  component: UseParamsExample,
});

function UseParamsExample() {
  // First method: Using the useParams method of the route object
  const params = Route.useParams();

  // Second method: Using the useParams hook directly
  const params2 = useParams({ from: '/examples/use-params' });

  // Third method: Using with strict mode set to false
  // When strict is false, retrieves parameters from the current route
  // and skips validation even if validateParams is defined
  const params3 = useParams({ strict: false }) as { id: string };

  return (
    <>
      <Text>{params.id}</Text>
      <Text>{params2.id}</Text>
      <Text>{params3.id}</Text>
    </>
  );
}
```

:::
