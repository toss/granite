import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundPage() {
  return (
    <View style={styles.container}>
      <Text>404 Not Found</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
