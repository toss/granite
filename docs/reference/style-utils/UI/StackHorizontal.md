---
sourcePath: packages/style-utils/src/stack.tsx
---

# StackHorizontal

`Stack.Horizontal` is a component that arranges child elements in a horizontal stack. Using this component, you can easily control the spacing between child elements with the `gutter` property, maintaining a consistent layout in the horizontal direction.

## Signature

```typescript
StackHorizontal: import('react').ForwardRefExoticComponent<
  StackWithoutDirectionProps & import('react').RefAttributes<View>
>;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">The props object passed to the component.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.align</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;stretch&#39; | &#39;baseline&#39;</span> · <span class="post-parameters--default">&#39;stretch&#39;</span>
        <br />
        <p class="post-parameters--description">The value that sets the horizontal alignment of child elements. Works the same as Flexbox&#39;s <code>align-items</code> property, with a default value of <code>&#39;stretch&#39;</code> that expands child elements to match the parent&#39;s width when their width is <code>&#39;auto&#39;</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.justify</span><span class="post-parameters--type">&#39;flex-start&#39; | &#39;flex-end&#39; | &#39;center&#39; | &#39;space-between&#39; | &#39;space-around&#39; | &#39;space-evenly&#39;</span> · <span class="post-parameters--default">&#39;flex-start&#39;</span>
        <br />
        <p class="post-parameters--description">The value that sets the horizontal alignment of child elements. Works the same as Flexbox&#39;s <code>justify-content</code> property, with a default value of <code>&#39;flex-start&#39;</code> that aligns child elements to the top.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.gutter</span><span class="post-parameters--type">number | ReactElement</span>
        <br />
        <p class="post-parameters--description">The value that sets the spacing between child elements. When a number is provided, it sets the margin in pixels, and when a <code>ReactElement</code> is passed, that component is used as the spacing. Using a number allows for precise control of spacing, while using a <code>ReactElement</code> enables more complex custom spacing implementations.</p>
      </li>
    </ul>
  </li>
</ul>

## Example

### Example of arranging elements horizontally with a spacing of 16

```tsx
import { Stack } from '@granite-js/react-native';
import { View, Text } from 'react-native';

function StackHorizontalExample() {
  return (
    <Stack.Horizontal gutter={16}>
      <Text>Arrange horizontally with 16 spacing</Text>
      <Text>1</Text>
      <Text>2</Text>
      <Text>3</Text>
    </Stack.Horizontal>
  );
}
```
