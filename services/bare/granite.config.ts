import { microFrontend } from '@granite-js/micro-frontend/plugin';
import { hermes } from '@granite-js/plugin-hermes';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'bare',
  scheme: 'granite',
  plugins: [
    hermes(),
    microFrontend({
      exposes: {
        './App': './src/_app.tsx',
      },
      shared: ['react', 'react-native'],
    }),
  ],
});
