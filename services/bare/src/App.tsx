import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bare App</Text>
      <Text style={styles.description}>This screen was loaded from the bare micro-frontend bundle.</Text>
      <Text style={styles.count}>Count: {count}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => setCount((current) => current + 1)}
      >
        <Text style={styles.buttonLabel}>Increment Count</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => Linking.openURL('granite://showcase')}
      >
        <Text style={styles.buttonLabel}>Open Showcase App</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
  },
  count: {
    marginTop: 20,
    fontSize: 20,
    color: '#1A202C',
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0064FF',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
