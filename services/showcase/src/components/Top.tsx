import { View, Text, StyleSheet } from 'react-native';

interface TopProps {
  label: string;
}

export function Top({ label }: TopProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    color: '#202632',
    fontWeight: 'bold',
    fontSize: 24,
  },
});
