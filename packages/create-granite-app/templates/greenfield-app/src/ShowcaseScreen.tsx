import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const nativeModules = [
  '@granite-js/image',
  '@granite-js/lottie',
  '@granite-js/video',
  '@react-native-async-storage/async-storage',
  '@react-native-community/blur',
  '@react-navigation/native',
  '@shopify/flash-list',
  'react-native-gesture-handler',
  'react-native-pager-view',
  'react-native-screens',
  'react-native-svg',
  'react-native-webview',
];

export function ShowcaseScreen() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.container}>
            <Text style={styles.eyebrow}>%%nativeAppName%%</Text>
            <Text style={styles.title}>Granite Greenfield</Text>
            <Text style={styles.description}>
              A bare React Native app scaffolded with Granite routing, Metro config, Hermes, and direct native module
              dependencies.
            </Text>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Installed native modules</Text>
              {nativeModules.map((moduleName) => (
                <Text key={moduleName} style={styles.moduleName}>
                  {moduleName}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  eyebrow: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: '#475467',
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 14,
  },
  panelTitle: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  moduleName: {
    color: '#101828',
    fontSize: 14,
  },
});
