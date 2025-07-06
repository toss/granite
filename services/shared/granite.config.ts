import { hermes } from '@granite-js/plugin-hermes';
import { shared } from '@granite-js/plugin-shared-modules';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'shared',
  scheme: 'granite',
  entryFile: 'index.ts',
  plugins: [
    hermes(),
    shared({
      name: 'shared',
      remote: {
        host: 'localhost',
        port: 8082,
      },
      shared: {
        '@react-native-community/blur': {
          singleton: true,
          eager: true,
        },
        '@react-navigation/native': {
          singleton: true,
          eager: true,
        },
        '@react-navigation/native-stack': {
          singleton: true,
          eager: true,
        },
        '@shopify/flash-list': {
          singleton: true,
          eager: true,
        },
        'lottie-react-native': {
          singleton: true,
          eager: true,
        },
        'react-native-safe-area-context': {
          singleton: true,
          eager: true,
        },
        'react-native-screens': {
          singleton: true,
          eager: true,
        },
        'react-native-fast-image': {
          singleton: true,
          eager: true,
        },
        'react-native-svg': {
          singleton: true,
          eager: true,
        },
        'react-native-gesture-handler': {
          singleton: true,
          eager: true,
        },
        'react-native': {
          singleton: true,
          eager: true,
        },
        react: {
          singleton: true,
          eager: true,
        },
        'react-native-video': {
          singleton: true,
          eager: true,
        },
        'react-native-webview': {
          singleton: true,
          eager: true,
        },
      },
    }),
  ],
});
