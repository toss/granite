import { env } from '@granite-js/plugin-env';
import { hermes } from '@granite-js/plugin-hermes';
import { microFrontend } from '@granite-js/plugin-micro-frontend';
import { router } from '@granite-js/plugin-router';
import { sentry } from '@granite-js/plugin-sentry';
import { defineConfig } from '@granite-js/react-native/config';

const testStates = {
  babelPrinted: false,
  swcPrinted: false,
};

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
    {
      name: 'custom-build-options',
      config: {
        INTERNAL__esbuildOptions(context, buildOptions) {
          console.debug('[DEBUG] Build options for:', context);

          return buildOptions;
        },
        INTERNAL__babelOptions(context, babelOptions) {
          if (!testStates.babelPrinted) {
            console.debug('[DEBUG] Babel options for:', context);
            testStates.babelPrinted = true;
          }

          return babelOptions;
        },
        INTERNAL__swcOptions(context, swcOptions) {
          if (!testStates.swcPrinted) {
            console.debug('[DEBUG] Swc options for:', context);
            testStates.swcPrinted = true;
          }

          return swcOptions;
        },
      },
    },
  ],
});
