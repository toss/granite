---
sourcePath: packages/react-native/src/keyboard/KeyboardAboveView.tsx
---

# KeyboardAboveView

A component that automatically lifts child components above the keyboard when it appears on the screen.
It's useful when you want to keep elements like a "Send" button fixed above the keyboard during text input.

## Signature

```typescript
function KeyboardAboveView({ style, children, ...props }: ComponentProps<typeof View>): ReactElement;
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props.style</span><span class="post-parameters--type">StyleProp&lt;ViewStyle&gt;</span>
    <br />
    <p class="post-parameters--description">Additional styles can be applied. For example, you can set background color or size.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props.children</span><span class="post-parameters--type">ReactNode</span>
    <br />
    <p class="post-parameters--description">Components to be displayed above the keyboard when it appears. For example, you can include buttons, text input fields, etc.</p>
  </li>
</ul>

### Return Value

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--type">ReactElement</span>
    <br />
    <p class="post-parameters--description">Returns an <a href="https://reactnative.dev/docs/animated#createanimatedcomponent" target="_blank" rel="noreferrer">`Animated.View`</a> that is adjusted above the keyboard when it appears.</p>
  </li>
</ul>

## Example

### Lifting elements above the keyboard

```tsx
import { ScrollView, TextInput, View, Text } from 'react-native';
import { KeyboardAboveView } from '@granite-js/react-native';

export function KeyboardAboveViewExample() {
  return (
    <>
      <ScrollView>
        <TextInput placeholder="placeholder" />
      </ScrollView>

      <KeyboardAboveView>
        <View style={{ width: '100%', height: 50, backgroundColor: 'yellow' }}>
          <Text>Above the keyboard</Text>
        </View>
      </KeyboardAboveView>
    </>
  );
}
```
