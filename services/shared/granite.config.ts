import { hermes } from '@granite-js/plugin-hermes';
import { microFrontend } from '@granite-js/plugin-micro-frontend';
import { defineConfig } from '@granite-js/react-native/config';

const SHARED_MODULES = [
  '@react-native-async-storage/async-storage',
  '@react-native-community/blur',
  '@react-navigation/elements',
  '@react-navigation/native',
  '@react-navigation/native-stack',
  '@shopify/flash-list',
  '@sentry/react-native',
  '@granite-js/image',
  '@granite-js/lottie',
  '@granite-js/video',
  'brick-module',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-gesture-handler',
  'react-native-pager-view',
  'react-native',
  'react',
  'react-native-webview',
];

const SHARED_MODULE_CONFIG = Object.fromEntries(SHARED_MODULES.map((packageName) => [packageName, { eager: true }]));

export default defineConfig({
  appName: 'shared',
  scheme: 'granite',
  plugins: [
    hermes(),
    microFrontend({
      name: 'shared',
      shared: SHARED_MODULE_CONFIG,
    }),
  ],
});
