import { env } from '@granite-js/plugin-env';
import { hermes } from '@granite-js/plugin-hermes';
import { microFrontend } from '@granite-js/plugin-micro-frontend';
import { router } from '@granite-js/plugin-router';
import { sentry } from '@granite-js/plugin-sentry';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  /**
   * granite://showcase
   */
  scheme: 'granite',
  appName: 'showcase',
  plugins: [
    router(),
    env({ MY_ENV: 'from granite.config.ts' }),
    hermes(),
    sentry({ useClient: false }),
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
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-svg',
        'react-native-gesture-handler',
        'react-native',
        'react',
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
    {
      name: 'context-plugin',
      config: (context) => {
        console.debug('[DEBUG] Context:', context);
      },
    },
  ],
});
