---
sourcePath: packages/react-native/src/intersection-observer/IOScrollView.ts
---

# IOScrollView

`IOScrollView` is a [ScrollView](https://reactnative.dev/docs/scrollview) component with added `Intersection Observer` functionality. It can detect when specific elements become visible or disappear from the screen during scrolling.
By utilizing this functionality with the `InView` component as a child element, you can easily check whether elements are exposed on the screen.

## Signature

```typescript
IOScrollView: ForwardRefExoticComponent<IOScrollViewProps & RefAttributes<IOScrollViewController>>;
```

## Example

You can check whether each item in the list appears on the screen using `IOScrollView`.
When each item in the list appears on the screen, the `InView` component changes to the `visible` state.

```tsx
import { ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InView, IOScrollView } from '@granite-js/react-native';

const mockData = Array.from({ length: 30 }, (_, i) => ({ key: String(i) }));

export default function IOScrollViewPage() {
  return (
    <IOScrollView>
      {mockData.map((data) => (
        <InViewItem key={data.key}>{data.key}</InViewItem>
      ))}
    </IOScrollView>
  );
}

function InViewItem({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  return (
    <InView onChange={setVisible}>
      <View style={styles.item}>
        <Text>{children}</Text>
        <Text>{visible ? 'visible' : ''}</Text>
      </View>
    </InView>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
});
```
