---
sourcePath: packages/react-native/src/intersection-observer/InView.tsx
---

# InView

The `InView` component detects when an element starts to become visible on the screen or disappears from the screen.
When an element starts to become visible on the screen, the `onChanged` handler is called with `true` as the first argument. Conversely, when the element disappears from the screen, `false` is passed.
The second argument of the `onChanged` handler receives the exposure ratio of the element on the screen. The exposure ratio value ranges from `0` to `1.0`. For example, if `0.2` is passed, it means the component is 20% exposed on the screen.

::: warning Note

`InView` must be used inside [IOScrollView](./IOScrollView) or [IOFlatList](./IOFlatList) that includes `IOContext`.
If used outside of `IOContext`, an `IOProviderMissingError` will occur.

:::

## Signature

```typescript
declare class InView<T = ViewProps> extends PureComponent<InViewProps<T>> {
  static contextType: import('react').Context<IOContextValue>;
  static defaultProps: Partial<InViewProps>;
  context: undefined | IOContextValue;
  mounted: boolean;
  protected element: Element;
  protected instance: undefined | ObserverInstance;
  protected view: any;
  constructor(props: InViewProps<T>);
  componentDidMount(): void;
  componentWillUnmount(): void;
  protected handleChange: (inView: boolean, areaThreshold: number) => void;
  protected handleRef: (ref: any) => void;
  protected handleLayout: (event: LayoutChangeEvent) => void;
  measure: (...args: any) => void;
  measureInWindow: (...args: any) => void;
  measureLayout: (...args: any) => void;
  setNativeProps: (...args: any) => void;
  focus: (...args: any) => void;
  blur: (...args: any) => void;
  render(): import('react/jsx-runtime').JSX.Element | null;
}
```

### Parameter

<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">props</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">Object</span>
    <br />
    <p class="post-parameters--description">Props object passed to the component.</p>
    <ul class="post-parameters-ul">
      <li class="post-parameters-li">
        <span class="post-parameters--name">props.children</span><span class="post-parameters--required">required</span> · <span class="post-parameters--type">React.ReactNode</span>
        <br />
        <p class="post-parameters--description">Child components to be rendered under the component.</p>
      </li>
    </ul>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">prop.as</span><span class="post-parameters--type">React.ComponentType</span> · <span class="post-parameters--default">View</span>
    <br />
    <p class="post-parameters--description">Specifies the component to actually render. Default is the <a href="https://reactnative.dev/docs/view" target="_blank" rel="noreferrer">View</a> component.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">triggerOnce</span><span class="post-parameters--type">boolean</span> · <span class="post-parameters--default">false</span>
    <br />
    <p class="post-parameters--description">Use this option if you want to call the <code>onChange</code> callback only once when the element first becomes visible.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onLayout</span><span class="post-parameters--type">(event: LayoutChangeEvent) =&gt; void</span>
    <br />
    <p class="post-parameters--description">Callback function called when there is a change in the layout.</p>
  </li>
</ul>
<ul class="post-parameters-ul">
  <li class="post-parameters-li post-parameters-li-root">
    <span class="post-parameters--name">onChange</span><span class="post-parameters--type">(inView: boolean, areaThreshold: number) =&gt; void</span>
    <br />
    <p class="post-parameters--description">Callback function called when an element appears or disappears from the screen. The first argument receives the visibility status, and the second argument receives the exposure ratio.</p>
  </li>
</ul>

## Example

### Detecting the `10%` point of an element using the `InView` component

```tsx
import { LayoutChangeEvent, View, Text, Dimensions } from 'react-native';
import { InView, IOScrollView } from '@granite-js/react-native';

export function InViewExample() {
  const handleLayout = (event: LayoutChangeEvent) => {
    console.log('Layout changed', event.nativeEvent.layout);
  };

  const handleChange = (inView: boolean, areaThreshold: number) => {
    if (inView) {
      console.log(`Element is visible at ${areaThreshold * 100}% ratio`);
    } else {
      console.log('Element is not visible');
    }
  };

  return (
    <IOScrollView>
      <View style={{ height: HEIGHT, width: '100%', backgroundColor: 'blue' }}>
        <Text style={{ color: 'white' }}>Please scroll down</Text>
      </View>
      <InView onLayout={handleLayout} onChange={handleChange}>
        <View style={{ width: 100, height: 300, backgroundColor: 'yellow' }}>
          <View style={{ position: 'absolute', top: 30, width: 100, height: 1, borderWidth: 1 }}>
            <Text style={{ position: 'absolute', top: 0 }}>10% point</Text>
          </View>
        </View>
      </InView>
    </IOScrollView>
  );
}
```
