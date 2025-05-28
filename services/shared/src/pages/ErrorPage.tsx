import { View, Text } from 'react-native';

export function ErrorPage() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignContent: 'center',
      }}
    >
      <Text>Something went wrong</Text>
    </View>
  );
}
