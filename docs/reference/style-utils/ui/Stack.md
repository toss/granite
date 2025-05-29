---
sourcePath: packages/style-utils/src/stack.tsx
---

# Stack

`Stack` is a component that arranges child elements in a stack layout either horizontally or vertically, and allows you to set spacing between child elements.
You can specify the direction as horizontal or vertical using the `direction` property, and control the spacing between child elements using the `gutter` property.
You can use `Stack.Horizontal` for horizontal arrangement and `Stack.Vertical` for vertical arrangement.

## Signature

```typescript
Stack: StackType;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">The props object passed to the component.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.align</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;stretch&#39; | &#39;baseline&#39;</span>
        <br />
        <p class="post-parameters--description">The alignment value for child elements along the main axis (Flex direction). For example, in <code>&#39;column&#39;</code> direction, <code>&#39;center&#39;</code> places elements at the horizontal center, and <code>&#39;stretch&#39;</code> expands elements to match the parent&#39;s width when their width is <code>&#39;auto&#39;</code>. This value is applied to <a href="https://reactnative.dev/docs/0.72/layout-props#alignitems" target="_blank" rel="noreferrer">`alignItems`</a>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.justify</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;space-between&#39; | &#39;space-around&#39; | &#39;space-evenly&#39;</span>
        <br />
        <p class="post-parameters--description">The alignment value for child elements along the cross axis (perpendicular to Flex direction). For example, in <code>&#39;column&#39;</code> direction, <code>flex-start</code> places elements at the top of the parent, and <code>&#39;center&#39;</code> places them at the vertical center. This value is applied to <a href="https://reactnative.dev/docs/0.72/layout-props#justifycontent" target="_blank" rel="noreferrer">`justifyContent`</a>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.direction</span><span class="post-parameters--type">&#39;vertical&#39; | &#39;horizontal&#39;</span> · <span class="post-parameters--default">&#39;vertical&#39;</span>
        <br />
        <p class="post-parameters--description">The value that sets the direction in which child elements are arranged. Default value is <code>&#39;vertical&#39;</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.gutter</span><span class="post-parameters--type">number | ReactElement</span>
        <br />
        <p class="post-parameters--description">The value that sets the spacing between child elements. When a number is provided, it sets the margin in pixels, and when a <code>ReactElement</code> is passed, that component is used as the spacing. Using a number allows for precise control of spacing, while using a <code>ReactElement</code> enables more complex custom spacing implementations.</p>
      </li>
    </ul>
  </li>
</ul>

### Property

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">Horizontal</span><span class="post-parameters--type">StackHorizontal</span>
    <br />
    <p class="post-parameters--description"><code>Stack.Horizontal</code> is a component that arranges child elements in a <strong>horizontal</strong> stack.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">Vertical</span><span class="post-parameters--type">StackVertical</span>
    <br />
    <p class="post-parameters--description"><code>Stack.Vertical</code> is a component that arranges child elements in a <strong>vertical</strong> stack.</p>
  </li>
</ul>

## Example

### Example of arranging elements horizontally and vertically with a spacing of 16

```tsx
import { Text } from 'react-native';
import { Stack } from '@granite-js/react-native';

export function StackExample() {
  return (
    <>
      <Stack gutter={16} direction="horizontal">
        <Text>Arrange horizontally with 16 spacing</Text>
        <Text>1</Text>
        <Text>2</Text>
        <Text>3</Text>
      </Stack>
      <Stack gutter={16} direction="vertical">
        <Text>Arrange vertically with 16 spacing</Text>
        <Text>1</Text>
        <Text>2</Text>
        <Text>3</Text>
      </Stack>
    </>
  );
}
```
