---
sourcePath: packages/react-native/src/scroll-view-inertial-background/ScrollViewInertialBackground.tsx
---

# ScrollViewInertialBackground

Adds background colors to the top and bottom spaces of iOS `ScrollView` content to provide a natural visual effect when scrolling.
In iOS, when scrolling reaches the end, a slight bouncing effect occurs, known as the [Bounce effect](https://medium.com/@wcandillon/ios-bounce-list-effect-with-react-native-5102e3a83999). Setting background colors in the spaces above and below the content can provide a more consistent user experience.

## Signature

```typescript
function ScrollViewInertialBackground({
  topColor,
  bottomColor,
  spacer: _spacer,
}: ScrollViewInertialBackgroundProps): import('react/jsx-runtime').JSX.Element;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--type">object</span>
    <br />
    <p class="post-parameters--description"><code>props</code> object passed to the component.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.topColor</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">Background color to apply to the top area of the scroll. Default is <code>adaptive.background</code> which is automatically applied based on the system theme.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.bottomColor</span><span class="post-parameters--type">string</span>
        <br />
        <p class="post-parameters--description">Background color to apply to the bottom area of the scroll. Default is <code>adaptive.background</code> which is automatically applied based on the system theme.</p>
      </li>
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.spacer</span><span class="post-parameters--type">number</span>
        <br />
        <p class="post-parameters--description">Specifies the size of the space between the top and bottom areas where the background color is applied. Default uses the screen height obtained from <a href="https://reactnative.dev/docs/next/usewindowdimensions" target="_blank" rel="noreferrer">`useWindowDimensions`</a>.</p>
      </li>
    </ul>
  </li>
</ul>

## Example

### Adding background colors to the top and bottom of a scroll view

Adds red background color to the top and blue to the bottom of the scroll view. The background color is applied to areas outside the scroll.

```tsx
import { ScrollView, View, Text } from 'react-native';
import { ScrollViewInertialBackground } from '@granite-js/react-native';

const dummies = Array.from({ length: 20 }, (_, i) => i);

export function InertialBackgroundExample() {
  return (
    <ScrollView>
      <ScrollViewInertialBackground topColor="red" bottomColor="blue" />
      {dummies.map((i) => (
        <View
          key={`dummy-${i}`}
          style={{ width: '100%', height: 100, borderBottomColor: 'black', borderBottomWidth: 1 }}
        >
          <Text>Try scrolling.</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```
