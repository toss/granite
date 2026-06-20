import { router } from '@granite-js/plugin-router';
import { hermes } from '@granite-js/plugin-hermes';
import { microFrontend } from '@granite-js/plugin-micro-frontend';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: '%%appName%%',
  scheme: 'granite',
  plugins: [
    router(),
    hermes(),
    microFrontend({
      name: '%%appName%%',
      exposes: {
        './AppContainer': './src/_app.tsx',
      },
      shared: [
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
      ],
    }),
  ],
});
