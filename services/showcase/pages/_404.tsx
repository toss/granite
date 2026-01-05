import React from 'react';
import { Text, View } from 'react-native';

export default function NotFoundPage() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>404 Not Found</Text>
    </View>
  );
}
