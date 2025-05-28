---
sourcePath: packages/style-utils/src/spacing.tsx
---

# Spacing

`Spacing` is a component that adds margin by occupying empty space. You can specify the size of the margin in either horizontal or vertical direction.

## Signature

```typescript
Spacing: import('react').NamedExoticComponent<Props>;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description">The <code>props</code> object passed to the component.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.size</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">number</span>
        <br />
        <p class="post-parameters--description">A numeric value that sets the size of the margin.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.direction</span><span class="post-parameters--type">&#39;vertical&#39; | &#39;horizontal&#39;</span> · <span class="post-parameters--default">&#39;vertical&#39;</span>
        <br />
        <p class="post-parameters--description">Sets the direction in which the margin will occupy space. Default value is <code>&#39;vertical&#39;</code>.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.style</span><span class="post-parameters--type">StyleProp&lt;ViewStyle&gt;</span>
        <br />
        <p class="post-parameters--description">The <code>style</code> value to be applied to the <code>Spacing</code> component. Default value is <code>undefined</code>, used when applying additional styles.</p>
      </li>
    </ul>
  </li>
</ul>

## Example

### Example of creating empty space by adding margins of size `16` in both horizontal and vertical directions

```tsx
import { View, Text } from 'react-native';
import { Spacing } from '@granite-js/react-native';

export function SpacingExample() {
  return (
    <View>
      <Text>Top</Text>
      <Spacing size={16} direction="vertical" style={{ backgroundColor: 'red', width: 5 }} />
      <Text>Bottom, positioned below by the vertical margin</Text>

      <View style={{ flexDirection: 'row' }}>
        <Text>Left</Text>
        <Spacing size={16} direction="horizontal" style={{ backgroundColor: 'red', height: 5 }} />
        <Text>Right, positioned to the side by the horizontal margin</Text>
      </View>
    </View>
  );
}
```
