import React from 'react';
import { Text, View } from 'react-native';
import { createRoute } from '@granite-js/react-native';

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: Index,
});

export function Index() {
  return (
    <View>
      <Text>Hello Index</Text>
    </View>
  );
}
