import { microFrontend } from '@granite-js/micro-frontend/plugin';
import { hermes } from '@granite-js/plugin-hermes';
import { defineConfig } from 'rollipop';

const shared = [
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

const allowedPhantomDependencies = ['@react-native-masked-view/masked-view', 'react-native-reanimated'];

export default defineConfig({
  // Metro can defer missing optional dependencies to runtime, but Rollipop's strict
  // dependency resolution fails at build time. Externalize them so the existing
  // try/catch fallbacks can handle missing modules at runtime.
  external: allowedPhantomDependencies,
  plugins: [
    hermes(),
    microFrontend({
      appName: 'shared',
      shared: shared.reduce(
        (modules, moduleName) => ({
          ...modules,
          [moduleName]: { eager: true },
        }),
        {} as Record<string, { eager: boolean }>
      ),
    }),
  ],
});
