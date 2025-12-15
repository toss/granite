import { createNativeStackNavigator } from '@react-navigation/native-stack';

function createStackNavigator() {
  const Stack = createNativeStackNavigator();

  return {
    Navigator: Stack.Navigator,
    Screen: Stack.Screen,
  };
}

export const StackNavigator = createStackNavigator();
