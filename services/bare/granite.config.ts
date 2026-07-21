import { env } from '@granite-js/plugin-env';
import { hermes } from '@granite-js/plugin-hermes';
import { microFrontend } from '@granite-js/plugin-micro-frontend';
import { router } from '@granite-js/plugin-router';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  scheme: 'granite',
  appName: 'bare',
  plugins: [
    router(),
    env({ MY_ENV: 'bare' }),
    hermes(),
    microFrontend({
      name: 'bare',
      exposes: {
        './AppContainer': './src/_app.tsx',
        './Service': './src/Service.tsx',
      },
      shared: [
        '@granite-js/image',
        '@granite-js/lottie',
        '@granite-js/video',
        '@react-native-async-storage/async-storage',
        '@react-native-community/blur',
        '@react-navigation/elements',
        '@react-navigation/native',
        '@react-navigation/native-stack',
        '@sentry/react-native',
        '@shopify/flash-list',
        'brick-module',
        'react',
        'react-native',
        'react-native-gesture-handler',
        'react-native-pager-view',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-svg',
        'react-native-webview',
      ],
    }),
  ],
});
