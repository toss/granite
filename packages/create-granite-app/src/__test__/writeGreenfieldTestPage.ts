import fs from 'fs/promises';
import path from 'path';

export const greenfieldNativeModuleTestPage = `import { createRoute } from '@granite-js/react-native';
import AsyncStorage from '@granite-js/native/@react-native-async-storage/async-storage';
import { BlurView } from '@granite-js/native/@react-native-community/blur';
import { NavigationContainer } from '@granite-js/native/@react-navigation/native';
import { createNativeStackNavigator } from '@granite-js/native/@react-navigation/native-stack';
import { FlashList } from '@granite-js/native/@shopify/flash-list';
import LottieView from '@granite-js/native/lottie-react-native';
import FastImage from '@granite-js/native/react-native-fast-image';
import { GestureHandlerRootView } from '@granite-js/native/react-native-gesture-handler';
import PagerView from '@granite-js/native/react-native-pager-view';
import { SafeAreaProvider, SafeAreaView } from '@granite-js/native/react-native-safe-area-context';
import Svg, { Circle } from '@granite-js/native/react-native-svg';
import Video from '@granite-js/native/react-native-video';
import WebView from '@granite-js/native/react-native-webview';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const Stack = createNativeStackNavigator();

function ModuleCheckScreen() {
  useEffect(() => {
    AsyncStorage.setItem('greenfield-native-module-check', 'ok');
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root}>
          <Text>Greenfield native module test page</Text>
          <FastImage source={{ uri: 'https://example.com/image.png' }} style={styles.box} />
          <LottieView source={{ uri: 'https://example.com/animation.json' }} style={styles.box} />
          <Video source={{ uri: 'https://example.com/video.mp4' }} style={styles.box} />
          <BlurView blurType="light" style={styles.box} />
          <PagerView style={styles.box}>
            <View key="page-1" />
          </PagerView>
          <Svg height="24" width="24">
            <Circle cx="12" cy="12" fill="black" r="10" />
          </Svg>
          <WebView source={{ html: '<html><body>ok</body></html>' }} style={styles.box} />
          <FlashList data={['ok']} renderItem={({ item }) => <Text>{item}</Text>} />
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function NativeModuleRoute() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen component={ModuleCheckScreen} name="NativeModuleCheck" />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  box: {
    height: 24,
    width: 24,
  },
});

export const Route = createRoute('/', {
  component: NativeModuleRoute,
});
`;

export async function writeGreenfieldTestPage(appPath: string, source: string) {
  await fs.writeFile(path.join(appPath, 'src/pages/index.tsx'), source);
}
