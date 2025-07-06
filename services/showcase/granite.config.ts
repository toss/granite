import { env } from '@granite-js/plugin-env';
import { hermes } from '@granite-js/plugin-hermes';
import { router } from '@granite-js/plugin-router';
import { shared } from '@granite-js/plugin-shared-modules';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  /**
   * granite://showcase
   */
  scheme: 'granite',
  appName: 'showcase',
  plugins: [
    router(),
    env({ MY_ENV: 'test' }),
    hermes(),
    shared({
      name: 'showcase',
      shared: {
        '@react-native-community/blur': {
          singleton: true,
        },
        '@react-navigation/native': {
          singleton: true,
        },
        '@react-navigation/native-stack': {
          singleton: true,
        },
        '@shopify/flash-list': {
          singleton: true,
        },
        'lottie-react-native': {
          singleton: true,
        },
        'react-native-safe-area-context': {
          singleton: true,
        },
        'react-native-screens': {
          singleton: true,
        },
        'react-native-fast-image': {
          singleton: true,
        },
        'react-native-svg': {
          singleton: true,
        },
        'react-native-gesture-handler': {
          singleton: true,
        },
        'react-native': {
          singleton: true,
        },
        react: {
          singleton: true,
        },
        'react-native-video': {
          singleton: true,
        },
        'react-native-webview': {
          singleton: true,
        },
      },
    }),
    {
      name: 'test',
      build: {
        order: 'post',
        handler: function () {
          console.debug('[DEBUG] Plugin meta:', this.meta);
        },
      },
    },
  ],
});
