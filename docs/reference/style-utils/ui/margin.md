---
sourcePath: packages/style-utils/src/box-spacing.tsx
---

# margin

The `margin` function sets the outer spacing of a component to create appropriate spacing between components. You can specify horizontal (x), vertical (y), and individual direction (top, right, bottom, left) spacing using numbers.
You can apply the same value to all directions by entering a number, or set individual values for each direction. There are also presets for commonly used values for easy application.

## Signature

```typescript
margin: BoxSpacing;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">option</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">BoxSpacingOption</span>
    <br />
    <p class="post-parameters--description">The option value to specify outer spacing. If you enter a number, it applies the same value to all directions,</p>
  </li>
</ul>

or you can set individual values for each direction.

### Property

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">Returns a style object that sets the outer spacing of the component&#39;s horizontal direction (left and right) by the input number. The returned object is passed to the component&#39;s <code>style</code> property to apply the spacing.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x4</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 4px outer spacing in the horizontal direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x8</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 8px outer spacing in the horizontal direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x12</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 12px outer spacing in the horizontal direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x16</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 16px outer spacing in the horizontal direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x24</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 24px outer spacing in the horizontal direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">x32</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 32px outer spacing in the horizontal direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">Returns a style object that sets the outer spacing of the component&#39;s vertical direction (top and bottom) by the input number. The returned object is passed to the component&#39;s <code>style</code> property to apply the spacing.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y4</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 4px outer spacing in the vertical direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y8</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 8px outer spacing in the vertical direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y12</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 12px outer spacing in the vertical direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y16</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 16px outer spacing in the vertical direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y24</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 24px outer spacing in the vertical direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">y32</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 32px outer spacing in the vertical direction</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">Returns a style object that sets the outer spacing of the component&#39;s top direction by the input number. The returned object is passed to the component&#39;s <code>style</code> property to apply the spacing.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top4</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 4px outer spacing to the top</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top8</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 8px outer spacing to the top</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top12</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 12px outer spacing to the top</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top16</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 16px outer spacing to the top</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top24</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 24px outer spacing to the top</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">top32</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 32px outer spacing to the top</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">Returns a style object that sets the outer spacing of the component&#39;s right direction by the input number. The returned object is passed to the component&#39;s <code>style</code> property to apply the spacing.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right4</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 4px outer spacing to the right</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right8</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 8px outer spacing to the right</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right12</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 12px outer spacing to the right</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right16</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 16px outer spacing to the right</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right24</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 24px outer spacing to the right</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">right32</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 32px outer spacing to the right</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">Returns a style object that sets the outer spacing of the component&#39;s bottom direction by the input number. The returned object is passed to the component&#39;s <code>style</code> property to apply the spacing.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom4</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 4px outer spacing to the bottom</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom8</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 8px outer spacing to the bottom</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom12</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 12px outer spacing to the bottom</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom16</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 16px outer spacing to the bottom</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom24</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 24px outer spacing to the bottom</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">bottom32</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 32px outer spacing to the bottom</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">(value: number) =&gt; ViewStyle</span>
    <br />
    <p class="post-parameters--description">Returns a style object that sets the outer spacing of the component&#39;s left direction by the input number. The returned object is passed to the component&#39;s <code>style</code> property to apply the spacing.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left4</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 4px outer spacing to the left</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left8</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 8px outer spacing to the left</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left12</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 12px outer spacing to the left</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left16</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 16px outer spacing to the left</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left24</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 24px outer spacing to the left</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">left32</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">ViewStyle</span>
    <br />
    <p class="post-parameters--description">A style object that applies 32px outer spacing to the left</p>
  </li>
</ul>

## Example

### Example of applying 8px outer spacing in horizontal and vertical directions, and 100px spacing in the bottom direction

```tsx
import { margin } from '@granite-js/react-native';
import { View } from 'react-native';

function Component() {
  return (
    <View>
      <View style={margin.x8}>
        <Text>Has horizontal spacing</Text>
      </View>
      <View style={margin.y8}>
        <Text>Has vertical spacing</Text>
      </View>
      <View style={margin.bottom(100)}>
        <Text>Has 100px spacing at the bottom</Text>
      </View>
    </View>
  );
}
```
