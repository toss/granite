---
sourcePath: packages/style-utils/src/flex.tsx
---

# FlexCenterHorizontal

`Flex.CenterHorizontal` is a component for **horizontally centering** child elements based on [**Flexbox Layout**](https://reactnative.dev/docs/0.72/flexbox).
The `alignItems` property is set to `'center'`, placing child elements at the horizontal center of the parent component.

## Signature

```typescript
FlexCenterHorizontal: import('react').ForwardRefExoticComponent<Props & import('react').RefAttributes<View>>;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">The props object passed to the component.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.align</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;stretch&#39; | &#39;baseline&#39;</span> · <span class="post-parameters--default">&#39;center&#39;</span>
        <br />
        <p class="post-parameters--description">The alignment value for child elements along the main axis (Flex direction). For example, in <code>&#39;column&#39;</code> direction, <code>&#39;center&#39;</code> places elements at the horizontal center, and <code>&#39;stretch&#39;</code> expands elements to match the parent&#39;s width when their width is <code>&#39;auto&#39;</code>. This value is applied to <a href="https://reactnative.dev/docs/0.72/layout-props#alignitems" target="_blank" rel="noreferrer">`alignItems`</a>, with a default value of <code>&#39;center&#39;</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.justify</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;space-between&#39; | &#39;space-around&#39; | &#39;space-evenly&#39;</span> · <span class="post-parameters--default">&#39;flex-start&#39;</span>
        <br />
        <p class="post-parameters--description">The alignment value for child elements along the cross axis (perpendicular to Flex direction). For example, in <code>&#39;column&#39;</code> direction, <code>flex-start</code> places elements at the top of the parent, and <code>&#39;center&#39;</code> places them at the vertical center. This value is applied to <a href="https://reactnative.dev/docs/0.72/layout-props#justifycontent" target="_blank" rel="noreferrer">`justifyContent`</a>, with a default value of <code>&#39;flex-start&#39;</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.direction</span><span class="post-parameters--type">&#39;column&#39; | &#39;row&#39;</span> · <span class="post-parameters--default">&#39;column&#39;</span>
        <br />
        <p class="post-parameters--description">The value that sets the direction in which child elements are arranged. Default value is <code>&#39;column&#39;</code>, arranging elements vertically.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.style</span><span class="post-parameters--type">ViewProps[&#39;style&#39;]</span>
        <br />
        <p class="post-parameters--description">The <code>style</code> object to be applied to the <code>Flex.CenterHorizontal</code> component. Used to specify styles other than Flexbox layout, such as background color, border, and margin. Default value is <code>undefined</code>.</p>
      </li>
    </ul>
  </li>
</ul>

## Example

### Example of horizontally centering elements

```tsx
import { Flex } from '@granite-js/react-native';
import { Text } from 'react-native';

function FlexCenterHorizontalExample() {
  return (
    <Flex.CenterHorizontal style={{ width: '100%', height: 100, borderWidth: 1 }}>
      <Text>Place at the horizontal center</Text>
    </Flex.CenterHorizontal>
  );
}
```
