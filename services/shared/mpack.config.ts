import { defineConfig } from '@granite-js/mpack/config';
import { hermes } from '@granite-js/plugin-hermes';
import { microFrontend } from '@granite-js/plugin-micro-frontend';

const SHARED_MODULES = [
  // FIXME: Sandbox app update is required
  // '@react-native-async-storage/async-storage',
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
    hermes(),
    microFrontend({
      name: 'shared',
      remote: {
        host: 'localhost',
        port: 8082,
      },
      shared: SHARED_MODULES.reduce(
        (prev, packageName) => ({
          ...prev,
          [packageName]: { eager: true },
        }),
        {} as Record<string, { eager: boolean }>
      ),
    }),
  ],
});
