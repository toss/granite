---
sourcePath: packages/react-native/src/intersection-observer/IOFlatList.ts
---

# IOFlatList

`IOFlatList`는 스크롤 중 특정 요소가 화면에 보이거나 사라지는지를 감지하기 위해 Intersection Observer 기능을 추가한 `FlatList` 컴포넌트예요. 이 컴포넌트를 사용하면 리스트의 각 항목이 화면에 나타나는지 여부를 쉽게 확인하고 처리할 수 있어요.

`InView`와 함께 사용하면 각 요소의 노출 상태를 확인할 수 있어요. 자식 요소로 포함된 [InView](/ko/reference/react-native/screen-control/InView) 컴포넌트는 `IOFlatList`의 관찰 기능을 통해 요소가 화면에 보이는지 여부를 감지하고, 노출 상태에 따라 이벤트를 발생시켜요.

## 시그니처

```typescript
IOFlatList: typeof IOFlatListFunction;
```

## 예제

`IOFlatList`를 사용해 리스트의 각 항목이 화면에 나타나는지 여부를 확인할 수 있어요.
리스트의 각 항목이 화면에 나타나면 `InView` 컴포넌트가 `visible` 상태로 변경되어요.

```tsx
import { ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { InView, IOFlatList } from '@granite-js/react-native';

const mockData = Array.from({ length: 30 }, (_, i) => ({ key: String(i) }));

export default function FlatListPage() {
  return <IOFlatList data={mockData} renderItem={({ item }) => <InViewItem>{item.key}</InViewItem>} />;
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
