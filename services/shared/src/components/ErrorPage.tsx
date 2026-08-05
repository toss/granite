import { DevSettings, Pressable, StyleSheet, Text, View } from 'react-native';

export interface ErrorPageProps {
  readonly reason: string;
}

export function ErrorPage({ reason }: ErrorPageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unable to open app</Text>
      <Text style={styles.reason}>{reason}</Text>
      <Pressable accessibilityRole="button" onPress={() => DevSettings.reload()} style={styles.button}>
        <Text style={styles.buttonLabel}>Reload</Text>
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
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  reason: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    borderRadius: 8,
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
