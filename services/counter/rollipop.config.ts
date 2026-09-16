import { microFrontend } from '@granite-js/micro-frontend/plugin-next';
import { hermes } from '@granite-js/plugin-hermes/next';
import { router } from '@granite-js/plugin-router/next';
import { defineConfig } from 'rollipop';

const shared = [
  '@react-native-community/blur',
  '@react-navigation/native',
  '@react-navigation/native-stack',
  '@shopify/flash-list',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  'react-native-gesture-handler',
  'react-native',
  'react',
  'react-native-webview',
];

export default defineConfig({
  plugins: [
    router(),
    hermes(),
    microFrontend({
      appName: 'remoteApp',
      exposes: {
        './AppContainer': './src/_app.tsx',
      },
      shared,
    }),
  ],
});
