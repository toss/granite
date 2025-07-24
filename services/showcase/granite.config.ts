import { env } from '@granite-js/plugin-env';
import { hermes } from '@granite-js/plugin-hermes';
import { microFrontend } from '@granite-js/plugin-micro-frontend';
import { router } from '@granite-js/plugin-router';
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
    microFrontend({
      name: 'remoteApp',
      exposes: {
        './AppContainer': './src/_app.tsx',
      },
      shared: [
        '@react-native-community/blur',
        '@react-navigation/native',
        '@react-navigation/native-stack',
        '@shopify/flash-list',
        'lottie-react-native',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-fast-image',
        'react-native-svg',
        'react-native-gesture-handler',
        'react-native',
        'react',
        'react-native-video',
        'react-native-webview',
      ],
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
