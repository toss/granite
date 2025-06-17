import type { RegisterScreen } from '@granite-js/react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { context } from '../../../require.context';

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: Showcase,
});

const SHOWCASE_PAGES = (context.keys() as string[])
  .filter((key) => {
    return key.startsWith('./showcase/') && !(key.endsWith('index.tsx') || key.endsWith('_layout.tsx'));
  })
  .map((key) => key.replace(/^\.|\.tsx$/g, '')) as (keyof RegisterScreen)[];

function Showcase() {
  const navigation = Route.useNavigation();

  const handlePressShowcaseItem = (page: keyof RegisterScreen) => {
    navigation.navigate(page);
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      {SHOWCASE_PAGES.map((page) => (
        <ShowcaseItem key={page} page={page} onPress={handlePressShowcaseItem.bind(null, page)} />
      ))}
    </ScrollView>
  );
}

function ShowcaseItem({ page, onPress }: { page: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Text style={styles.itemLabel}>{page}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  itemLabel: {
    fontSize: 16,
  },
});
