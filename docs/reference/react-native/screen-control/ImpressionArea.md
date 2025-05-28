---
sourcePath: packages/react-native/src/impression-area/ImpressionArea.tsx
---

# ImpressionArea

A component that detects whether a specific component is visible on the screen and notifies the outside. Using this component, you can easily implement features like collecting logs or running animations when a specific component becomes visible on the screen.
The visibility is detected using the return value of `useVisibility` and the `IOScrollView` and `InView` components that indicate whether the component is displayed within the viewport. When using `ScrollView` in React, even if a view is not visible on the screen, using `ImpressionArea` allows you to trigger events only when the view is actually visible on the screen.

::: info Note

`ImpressionArea` must be used inside `IOScrollView`. If you need to use it outside of `IOScrollView`, you can set the `UNSAFE__impressFallbackOnMount` property to `true` to detect based on when the component is mounted. If this property is set to `false` and used outside of `IOScrollView`, an `IOProviderMissingError` will occur.

:::

## Signature

```typescript
function ImpressionArea(props: Props): ReactElement;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onImpressionStart</span><span class="post-parameters--type">() =&gt; void</span>
    <br />
    <p class="post-parameters--description">Callback function that is executed when the child component becomes visible on the screen.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onImpressionEnd</span><span class="post-parameters--type">() =&gt; void</span>
    <br />
    <p class="post-parameters--description">Callback function that is executed when the child component is hidden from the screen.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">enabled</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">true</span>
    <br />
    <p class="post-parameters--description">Value that directly controls the condition for visibility. Default value is <code>true</code>. If passed as <code>false</code>, the <code>onImpressionStart</code> callback function will not be executed even if the component is visible.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">areaThreshold</span><span class="post-parameters--type">number</span> · <span class="post-parameters--default">0</span>
    <br />
    <p class="post-parameters--description">Value that sets the ratio of the visible area. If the component appears on the screen with a ratio greater than this value, <code>onImpressionStart</code> is called.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">timeThreshold</span><span class="post-parameters--type">number</span> · <span class="post-parameters--default">0</span>
    <br />
    <p class="post-parameters--description">Sets the time in milliseconds before <code>onImpressionStart</code> is called after this component becomes visible on the screen. Default value is <code>0</code> milliseconds (0 seconds).</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">style</span><span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description"><code>style</code> value to be applied to the <code>InView</code> component. Default value is <code>undefined</code>, used when you want to specify a style.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">UNSAFE__impressFallbackOnMount</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
    <br />
    <p class="post-parameters--description">Whether to consider the component as visible immediately when mounted. Default value is <code>false</code>.</p>
  </li>
</ul>

The value should be set between 0 and 1. Setting it to 0 triggers the event when even 1px of the component is visible. Conversely, setting it to 1 only triggers the event when the component is 100% visible on the screen.Useful when you cannot determine if the component is in the viewport without using `IOScrollView`. For example, a component located outside of `IOScrollView` will be considered visible at mount time if set to `true`.

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">ReactElement</span>
    <br />
    <p class="post-parameters--description">Returns a component that can detect visibility on the screen.</p>
  </li>
</ul>

## Example

### Basic Usage Example

```tsx
import { useState } from 'react';
import { Button, Dimensions, Text, View } from 'react-native';
import { ImpressionArea, IOScrollView } from '@granite-js/react-native';

export default function ImpressionAreaExample() {
  const [isImpressionStart, setIsImpressionStart] = useState(false);

  return (
    <>
      <Text>{isImpressionStart ? 'Impression Start' : 'Impression End'}</Text>
      <IOScrollView
        style={{
          flex: 1,
          margin: 16,
          backgroundColor: 'white',
        }}
      >
        <View
          style={{
            height: Dimensions.get('screen').height,
            borderWidth: 1,
            borderColor: 'black',
          }}
        >
          <Text>Scroll to here</Text>
        </View>

        <ImpressionArea
          onImpressionStart={() => setIsImpressionStart(true)}
          onImpressionEnd={() => setIsImpressionStart(false)}
        >
          <Button title="Button" />
        </ImpressionArea>
      </IOScrollView>
    </>
  );
}
```

### Example of Detection at Mount Time

When `ImpressionArea` is not located inside a component like `IOScrollView`, setting `UNSAFE__impressFallbackOnMount` to `true` will consider the component as visible when it is mounted.

```tsx
import { useState } from 'react';
import { Button, Dimensions, ScrollView, Text, View } from 'react-native';
import { ImpressionArea } from '@granite-js/react-native';

export default function ImpressionArea2Example() {
  const [isImpressionStart, setIsImpressionStart] = useState(false);

  return (
    <>
      <Text>{isImpressionStart ? 'Impression Start' : 'Impression End'}</Text>
      <ScrollView
        style={{
          flex: 1,
          margin: 16,
          backgroundColor: 'white',
        }}
      >
        <View
          style={{
            height: Dimensions.get('screen').height,
            borderWidth: 1,
            borderColor: 'black',
          }}
        >
          <Text>Scroll to here</Text>
        </View>

        <ImpressionArea
          UNSAFE__impressFallbackOnMount={true}
          onImpressionStart={() => setIsImpressionStart(true)}
          onImpressionEnd={() => setIsImpressionStart(false)}
        >
          <Button title="Button" />
        </ImpressionArea>
      </ScrollView>
    </>
  );
}
```
