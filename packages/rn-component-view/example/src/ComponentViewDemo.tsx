import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ComponentViewDemoProps {
  readonly title?: string;
  readonly itemCount?: number;
  /** Set by views that size the component, so it fills them. */
  readonly fillsView?: boolean;
}

/**
 * The component the native demo screens show. They change `itemCount` to grow and shrink it, and its button shows that
 * touches reach JavaScript.
 */
export function ComponentViewDemo({
  title = 'React Native component',
  itemCount = 1,
  fillsView = false,
}: ComponentViewDemoProps) {
  const [pressCount, setPressCount] = useState(0);

  return (
    <View style={[styles.card, fillsView && styles.fill]}>
      <Text style={styles.title}>{title}</Text>
      {Array.from({ length: itemCount }, (_, index) => (
        <Text key={index} style={styles.item}>
          {`Item ${index + 1}`}
        </Text>
      ))}
      <Pressable
        accessibilityRole="button"
        testID="component_view_demo_button"
        onPress={() => setPressCount((count) => count + 1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>{`Pressed ${pressCount} times`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#eaf2ff',
    borderRadius: 12,
    gap: 6,
    padding: 16,
  },
  fill: {
    flex: 1,
  },
  title: {
    color: '#1c1c1e',
    fontSize: 17,
    fontWeight: '700',
  },
  item: {
    color: '#48484a',
    fontSize: 15,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#0a66d8',
    borderRadius: 8,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
