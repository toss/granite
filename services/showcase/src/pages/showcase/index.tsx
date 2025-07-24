import { createRoute, type RegisterScreen } from '@granite-js/react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

export const Route = createRoute('/showcase', {
  validateParams: (params) => params,
  component: Showcase,
});

function Showcase() {
  const navigation = Route.useNavigation();
  const showcasePages = useMemo(
    () =>
      navigation
        .getState()
        .routeNames.filter((key) => {
          return key.startsWith('/showcase/') && !(key.endsWith('index.tsx') || key.endsWith('_layout.tsx'));
        })
        .map((key) => key.replace(/^\.tsx$/g, '')) as (keyof RegisterScreen)[],
    [navigation]
  );

  const handlePressShowcaseItem = (page: keyof RegisterScreen) => {
    navigation.navigate(page);
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      {showcasePages.map((page) => (
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
