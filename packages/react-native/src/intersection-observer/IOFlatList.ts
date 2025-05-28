import { RefAttributes } from 'react';
import { FlatList, FlatListProps } from 'react-native';
import withIO, { IOComponentProps } from './withIO';

export type IOFlatListController = FlatList;

export type IOFlatListProps<ItemT = any> = IOComponentProps & FlatListProps<ItemT>;

/**
 * @public
 * @category Screen Control
 * @name IOFlatList
 * @description
 * `IOFlatList` is a `FlatList` component with added Intersection Observer functionality to detect when specific elements become visible or disappear from the screen during scrolling. Using this component, you can easily check and handle whether each item in the list is visible on the screen.
 *
 * When used with `InView`, you can check the exposure status of each element. The [InView](/reference/react-native/Screen%20Control/InView) component included as a child element detects whether the element is visible on the screen through the observation functionality of `IOFlatList` and triggers events based on the exposure status.
 *
 * @example
 *
 * You can check whether each item in the list appears on the screen using `IOFlatList`.
 * When each item in the list appears on the screen, the `InView` component changes to the `visible` state.
 *
 * ```tsx
 * import { ReactNode, useState } from 'react';
 * import { StyleSheet, Text, View } from 'react-native';
 * import { InView, IOFlatList } from '@granite-js/react-native';
 *
 * const mockData = Array.from({ length: 30 }, (_, i) => ({ key: String(i) }));
 *
 * export default function FlatListPage() {
 *  return <IOFlatList data={mockData} renderItem={({ item }) => <InViewItem>{item.key}</InViewItem>} />;
 * }
 *
 * function InViewItem({ children }: { children: ReactNode }) {
 *  const [visible, setVisible] = useState(false);
 *
 *  return (
 *    <InView onChange={setVisible}>
 *      <View style={styles.item}>
 *        <Text>{children}</Text>
 *        <Text>{visible ? 'visible' : ''}</Text>
 *      </View>
 *    </InView>
 *  );
 * }
 *
 * const styles = StyleSheet.create({
 *  item: {
 *    padding: 16,
 *    borderBottomWidth: 1,
 *    borderBottomColor: '#ddd',
 *  },
 * });
 * ```
 */
const IOFlatList = withIO(FlatList, [
  'flashScrollIndicators',
  'getNativeScrollRef',
  'getScrollResponder',
  'getScrollableNode',
  'scrollToEnd',
  'scrollToIndex',
  'scrollToItem',
  'scrollToOffset',
]) as unknown as typeof IOFlatListFunction;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function IOFlatListFunction<ItemT = any>(
  props: IOFlatListProps<ItemT> & RefAttributes<IOFlatListController>
): JSX.Element;

export default IOFlatList;
